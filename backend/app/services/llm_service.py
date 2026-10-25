import logging


logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self,settings): self.settings=settings
    def answer(self,question:str,contexts:list[dict]):
        if not self.settings.openai_api_key: raise RuntimeError("LLM API key is not configured. Add OPENAI_API_KEY to backend/.env to generate answers.")
        from openai import (
            APIConnectionError,
            APIStatusError,
            AuthenticationError,
            BadRequestError,
            NotFoundError,
            OpenAI,
            PermissionDeniedError,
            RateLimitError,
        )
        client=OpenAI(api_key=self.settings.openai_api_key,base_url=self.settings.openai_base_url or None,timeout=60)
        evidence="\n\n".join(f"[Source {i+1}: {c['filename']}, page {c['page_number'] or 'not available'}, chunk {c['chunk_id']}]\n{c['content']}" for i,c in enumerate(contexts))
        if not evidence: evidence="No relevant document excerpts were retrieved."
        system_prompt=(
            "You are DocuMind AI, a helpful general-purpose assistant. Answer general "
            "knowledge questions normally. When a question asks about the user's uploaded "
            "documents, use only the supplied excerpts, cite supported claims using "
            "[Source N], and clearly say when the excerpts do not provide enough evidence. "
            "Never invent document contents, page numbers, or citations. Distinguish "
            "general knowledge from information found in the uploaded documents."
        )
        try:
            response=client.chat.completions.create(model=self.settings.openai_model,temperature=0.1,messages=[{"role":"system","content":system_prompt},{"role":"user","content":f"Question: {question}\n\nRetrieved excerpts:\n{evidence}"}])
        except AuthenticationError as exc:
            logger.warning("AI provider rejected the configured API key")
            raise RuntimeError("AI provider authentication failed. Replace OPENAI_API_KEY in backend/.env with a valid key, then restart the backend.") from exc
        except PermissionDeniedError as exc:
            logger.warning("AI provider denied access to the requested model or operation")
            raise RuntimeError("The AI provider denied access. Check account permissions and the configured model.") from exc
        except RateLimitError as exc:
            logger.warning("AI provider rate limit or quota was reached")
            raise RuntimeError("The AI provider rate limit or quota was reached. Check your provider usage and billing settings.") from exc
        except NotFoundError as exc:
            logger.warning("AI provider could not find the configured model")
            raise RuntimeError("The configured AI model was not found. Check OPENAI_MODEL and OPENAI_BASE_URL.") from exc
        except BadRequestError as exc:
            logger.warning("AI provider rejected the request")
            raise RuntimeError("The AI provider rejected the request. Check the configured model and provider compatibility.") from exc
        except APIConnectionError as exc:
            logger.warning("Could not connect to the AI provider")
            raise RuntimeError("Could not connect to the AI provider. Check internet access and OPENAI_BASE_URL.") from exc
        except APIStatusError as exc:
            logger.warning("AI provider returned HTTP status %s", exc.status_code)
            raise RuntimeError(f"The AI provider returned an error (HTTP {exc.status_code}). Check provider configuration and service status.") from exc
        return response.choices[0].message.content or "I could not generate an answer."
