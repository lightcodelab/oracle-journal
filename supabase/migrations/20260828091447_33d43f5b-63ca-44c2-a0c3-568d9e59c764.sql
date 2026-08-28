SELECT cron.schedule(
  'living-media-gc-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://gjaafbzhkdekgigmnafp.supabase.co/functions/v1/living-media-gc',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqYWFmYnpoa2Rla2dpZ21uYWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMTMwOTcsImV4cCI6MjA3OTc4OTA5N30.BbvF4OQW9TdV62sOg9M-8XSVX_k46Oxysg8tGPiMT1g"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);