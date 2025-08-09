-- Remove OpenAI and Anthropic providers and any stored user keys
-- Safely delete dependent keys first, then providers

-- Delete user keys for OpenAI/Anthropic
DELETE FROM public.user_ai_provider_keys u
USING public.ai_providers p
WHERE u.ai_provider_id = p.id
  AND p.provider_key IN ('openai','anthropic');

-- Delete OpenAI/Anthropic providers
DELETE FROM public.ai_providers
WHERE provider_key IN ('openai','anthropic');

-- Optional safety: ensure any lingering providers are inactive (no-op if deleted)
UPDATE public.ai_providers
SET is_active = false
WHERE provider_key IN ('openai','anthropic');