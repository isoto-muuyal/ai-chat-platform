# DIAGRAM.md

## App Diagram

```text
                           +----------------------------------+
                           |          External Clients        |
                           |----------------------------------|
                           | Roblox | Web App | WhatsApp      |
                           +-------------------+--------------+
                                               |
                           +-------------------+-------------------+
                           |                                       |
                           v                                       v
             +-----------------------------+         +-----------------------------+
             |         chat-api            |         |       reporting-app         |
             |-----------------------------|         |-----------------------------|
             | Express API                 |         | Express + React admin UI    |
             | /v1/chat/stream             |         | /api/auth                   |
             | /v1/recommendations         |         | /api, /api/export, /api/admin|
             | /v1/integrations/whatsapp   |         | /sources, /settings, etc.  |
             +-------------+---------------+         +--------------+--------------+
                           |                                          |
                           | reads/writes                             | reads/writes
                           v                                          v
                     +------------------------------------------------------+
                     |                    PostgreSQL                         |
                     |------------------------------------------------------|
                     | conversations                                         |
                     | messages                                              |
                     | analytics                                             |
                     | recommendations                                       |
                     | app_users                                             |
                     | account_settings                                      |
                     | account_destinations                                  |
                     | account_sources                                       |
                     | channel_conversations                                 |
                     +--------------------------+---------------------------+
                                                |
                                                | source -> destination
                                                v
                                  +-------------------------------+
                                  |      LLM Provider Layer       |
                                  |-------------------------------|
                                  | Gemini | OpenAI               |
                                  | (Ollama/Hugging Face config   |
                                  |  options exist in UI)         |
                                  +-------------------------------+
```

## Logic Diagram

```text
1. Admin configuration flow

   Admin user
      |
      v
   reporting-app UI (/sources)
      |
      v
   PUT /api/auth/source-management
      |
      v
   Store per-account config in PostgreSQL:
     - account_destinations
     - account_sources
     - account_settings (shared API key)


2. Standard chat request flow (Roblox / web / API client)

   Client request
     POST /v1/chat/stream
     body:
       - message
       - accountNumber
       - sourceClient
     header:
       - x-api-key
      |
      v
   chat-api validates request + account API key
      |
      v
   resolveSourceConfig(accountNumber, sourceClient)
      |
      +--> finds source in account_sources
      |      |
      |      +--> gets prompt
      |      +--> gets destination
      |      +--> gets provider/model/provider API key
      |
      +--> fallback to legacy account_settings sources/prompt if needed
      |
      v
   generateText(...)
      |
      +--> Gemini OR OpenAI
      |
      v
   SSE response to client:
     meta -> token -> done
      |
      v
   Async persistence/analysis
      |
      +--> sentimentAnalyzer.analyze(message)
      |
      +--> inferMeta(...)
      |      |
      |      +--> asks LLM for:
      |             - topic (1-2 words)
      |             - is_troll
      |
      +--> persistInteraction(...)
             |
             +--> conversations.topic
             +--> conversations.sentiment
             +--> messages
             +--> analytics


3. WhatsApp flow (Twilio)

   Twilio webhook
     POST /v1/integrations/whatsapp/twilio/webhook
      |
      v
   Validate Twilio signature
      |
      v
   resolveTwilioWhatsAppSource(To)
      |
      v
   generateText(...) using configured destination
      |
      v
   getOrCreateChannelConversation(account, source, external_user_id)
      |
      v
   persistInteraction(...)
      |
      v
   Return TwiML message response


4. Reporting / analytics flow

   reporting-app UI
      |
      +--> /dashboard
      +--> /topics
      +--> /conversations
      +--> /recommendations
      |
      v
   reporting-app API queries PostgreSQL
      |
      +--> aggregates conversations.topic
      +--> aggregates conversations.sentiment
      +--> filters by source_client, user, dates, troll flag
      |
      v
   Charts / tables / exports
     - topic counts
     - dominant sentiment per topic
     - positive / neutral / negative counts per topic
     - conversation drilldown
```

## Notes

- `sourceClient` remains the external client contract.
- Source configuration decides which destination/provider/model handles that source.
- Topic and sentiment are computed during chat persistence, then reused by reporting.
- WhatsApp currently supports Twilio text-in/text-out flow.
