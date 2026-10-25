# Evaluation and validation

## 20-question synthetic evaluation set

The fixture document is `evaluation/sample_document.txt`. It has 3 labelled sections: launch facts, budget table, and policy/unknowns. The 20 questions are in `evaluation/sample_questions.json`; expected answer points and supporting section/page labels are in `evaluation/expected_answers.json`. These are manual RAG evaluation fixtures, not claims of measured model accuracy.

## Validation record

The project-generation environment used Python 3.13.5, Node 22.16.0 and npm 10.9.2. Source syntax, dependency installation, API integration, test suite and frontend production build must be run on the target machine. Python 3.13 may lack compatible FAISS wheels; the README recommends Python 3.12. No live LLM request was made and no API key is included. The browser UI has not been manually exercised in this environment.

Suggested evaluation: measure retrieval recall@5 against expected sections; verify page/chunk citation IDs resolve to the retrieved content; include a no-answer question and check that the model abstains; test two accounts and confirm no cross-user results.

## Validation performed in the packaging environment (2026-10-24)

- Python source compilation (`python -m compileall -q app`): passed.
- Backend pytest: 4 passed, 1 skipped. The authentication/chat integration test was skipped because `python-jose` and `pwdlib` are not installed in this environment; install `backend/requirements.txt` to run it.
- Frontend production build: not completed. `npm install --no-audit --no-fund` timed out in this environment, so Vite/TypeScript build dependencies were unavailable. The API client syntax error found during the first build attempt was corrected, but a clean build still needs to be run after installing dependencies.
- Runtime API and browser flows: not manually exercised.
- Live LLM generation: not tested because no API key was configured.
- Embedding/FAISS indexing: not tested end-to-end in this environment.

These results are environment checks, not a claim that the full application has passed end-to-end acceptance testing.
