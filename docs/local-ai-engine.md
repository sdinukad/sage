[← Back to Overview](../README.md)

# Local AI Engine (BERT-Tiny)

Sage's edge intelligence is powered by a custom-trained **BERT-Tiny** model. This allows for near-instantant expense detection and feature extraction directly in the user's browser, significantly reducing latency and server costs.

## Why BERT-Tiny?

- **Small Footprint**: With only ~4.4 million parameters, it is exceptionally lightweight and fast.
- **Natural Language Understanding**: Despite its size, it captures semantic relationships better than traditional regex-based approaches.
- **On-Device Efficiency**: It can run efficiently in the browser using the **ONNX Runtime**, providing a smooth user experience regardless of internet connectivity.

---

## Model Pipeline

The AI engine follows a three-step pipeline:

### 1. Training (`ai/train_intent.py`)
The model is trained using a curated dataset of expense-related phrases.
- **Labels**: `is_expense` (Boolean), `category` (Multi-class), `amount` (Scalar/Regression), `date` (Entity).
- **Optimizer**: AdamW.
- **Loss Function**: Cross-Entropy for classification and Mean Squared Error for regression.

### 2. Exporting (`ai/export_onnx.py`)
Once trained, the PyTorch model is converted to the **ONNX** format.
- **Optimization**: Quantization is applied to reduce the model size by ~4x without significant loss in accuracy.
- **Output**: An `.onnx` file that can be loaded in any ONNX-compatible environment.

### 3. Execution (Browser)
The Web App uses `@microsoft/onnxruntime-web` to load and run the model.
- **Inference**: User input is tokenized and passed through the model.
- **Post-processing**: The model's outputs are mapped back to human-readable expense objects.

---

## Intent & Entity Extraction

The model is specifically tuned to recognize:
- **Intents**: Is the user trying to record an expense, query history, or just chatting?
- **Amounts**: Numerical values like "2000" or "1.5k".
- **Categories**: Automatically maps tokens to categories like `Food`, `Transport`, `Bills`, etc.
- **Dates**: Relative and absolute dates mentioned in the text.

## Limitations & Future Work

While the current BERT-Tiny model is excellent for basic extraction, we are constantly working to improve its accuracy for complex or ambiguous phrases. Future updates will include additional local models for advanced reasoning without compromising user privacy or application performance.
