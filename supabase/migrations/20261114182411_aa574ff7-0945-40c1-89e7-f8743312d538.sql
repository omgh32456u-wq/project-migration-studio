-- Mizo M2: per-account request log used for server-enforced quotas and rate limits.
-- Contains no message text, prompts or replies: only timing, status and reply length.
CREATE TABLE public.mizo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'aborted', 'failed', 'expired')),
  output_chars integer NOT NULL DEFAULT 0 CHECK (output_chars >= 0)
);

CREATE INDEX mizo_requests_user_created_idx ON public.mizo_requests (user_id, created_at DESC);

GRANT SELECT ON public.mizo_requests TO authenticated;
GRANT ALL ON public.mizo_requests TO service_role;

ALTER TABLE public.mizo_requests ENABLE ROW LEVEL SECURITY;

-- Signed-in users may read only their own usage rows. Nobody but the trusted server writes.
CREATE POLICY "Users can read their own Mizo usage"
  ON public.mizo_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Atomically checks the daily quota (UTC day), concurrency and per-minute burst for one account
-- and, when all pass, records a running request. A per-account advisory lock serialises callers.
CREATE OR REPLACE FUNCTION public.mizo_begin_request(
  _user_id uuid,
  _daily_limit integer,
  _concurrent_limit integer,
  _burst_limit integer,
  _stale_seconds integer DEFAULT 180
)
RETURNS TABLE (outcome text, request_id uuid, used_today integer, daily_limit integer, resets_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _day_start timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  _reset timestamptz := (date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day') AT TIME ZONE 'UTC';
  _used integer;
  _running integer;
  _recent integer;
  _id uuid;
BEGIN
  IF _user_id IS NULL OR _daily_limit < 0 OR _concurrent_limit < 1 OR _burst_limit < 1 THEN
    RAISE EXCEPTION 'invalid mizo limits';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('mizo:' || _user_id::text, 0));

  -- A request left running (crashed worker) stops counting as in flight but still counts for the day.
  UPDATE public.mizo_requests
     SET status = 'expired', finished_at = now()
   WHERE user_id = _user_id AND status = 'running'
     AND created_at < now() - make_interval(secs => _stale_seconds);

  -- Keep only a short history.
  DELETE FROM public.mizo_requests
   WHERE user_id = _user_id AND created_at < _day_start - interval '7 days';

  SELECT count(*) INTO _used FROM public.mizo_requests
   WHERE user_id = _user_id AND created_at >= _day_start AND status <> 'failed';
  IF _used >= _daily_limit THEN
    RETURN QUERY SELECT 'daily_limit'::text, NULL::uuid, _used, _daily_limit, _reset;
    RETURN;
  END IF;

  SELECT count(*) INTO _running FROM public.mizo_requests
   WHERE user_id = _user_id AND status = 'running';
  IF _running >= _concurrent_limit THEN
    RETURN QUERY SELECT 'concurrent_limit'::text, NULL::uuid, _used, _daily_limit, _reset;
    RETURN;
  END IF;

  SELECT count(*) INTO _recent FROM public.mizo_requests
   WHERE user_id = _user_id AND created_at > now() - interval '60 seconds';
  IF _recent >= _burst_limit THEN
    RETURN QUERY SELECT 'burst_limit'::text, NULL::uuid, _used, _daily_limit, _reset;
    RETURN;
  END IF;

  INSERT INTO public.mizo_requests (user_id) VALUES (_user_id) RETURNING id INTO _id;
  RETURN QUERY SELECT 'ok'::text, _id, _used + 1, _daily_limit, _reset;
END;
$$;

-- Closes a running request. 'failed' (provider error before any reply text) does not use up the day's quota.
CREATE OR REPLACE FUNCTION public.mizo_finish_request(
  _request_id uuid,
  _user_id uuid,
  _status text,
  _output_chars integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _status NOT IN ('completed', 'aborted', 'failed') THEN
    RAISE EXCEPTION 'invalid mizo status';
  END IF;
  UPDATE public.mizo_requests
     SET status = _status, finished_at = now(), output_chars = greatest(coalesce(_output_chars, 0), 0)
   WHERE id = _request_id AND user_id = _user_id AND status = 'running';
END;
$$;

-- Only the trusted server (service role) may start or finish requests.
REVOKE ALL ON FUNCTION public.mizo_begin_request(uuid, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mizo_finish_request(uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mizo_begin_request(uuid, integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mizo_finish_request(uuid, uuid, text, integer) TO service_role;