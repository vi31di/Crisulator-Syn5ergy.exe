from llama_cpp import Llama
from typing import Iterator

class LocalLLMService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LocalLLMService, cls).__new__(cls)
            cls._instance._init_model()
        return cls._instance

    def _init_model(self):
        # We load the model once when the service is instantiated
        model_path = r"C:\Users\harsh\OneDrive\Desktop\K S Harshitaa\Projects\Syn5ergy.exe\syn5ergy_v2\backend\agents\llama-3-maal-8b-instruct-v0.1.Q4_K_M.gguf"
        try:
            self._model = Llama(
                model_path=model_path,
                n_gpu_layers=-1, # Try to use GPU if available
                n_ctx=4096, # Context window
                verbose=False
            )
            print("Successfully loaded local LLM.")
        except Exception as e:
            print(f"Error loading local LLM: {e}")
            self._model = None

    def generate_response(self, system_prompt: str, user_message: str, max_tokens: int = 256) -> str:
        if not self._model:
            return "Error: LLM not loaded."
        
        prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{user_message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        
        response = self._model(
            prompt,
            max_tokens=max_tokens,
            stop=["<|eot_id|>"],
            echo=False
        )
        return response['choices'][0]['text'].strip()

    def generate_response_stream(self, system_prompt: str, user_message: str, max_tokens: int = 256) -> Iterator[str]:
        if not self._model:
            yield "Error: LLM not loaded."
            return

        prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{user_message}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        
        stream = self._model(
            prompt,
            max_tokens=max_tokens,
            stop=["<|eot_id|>"],
            stream=True,
            echo=False
        )
        for chunk in stream:
            if 'choices' in chunk and len(chunk['choices']) > 0:
                delta = chunk['choices'][0].get('text', '')
                if delta:
                    yield delta

llm_service = LocalLLMService()
