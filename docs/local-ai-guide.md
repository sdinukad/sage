[← Back to Overview](../README.md)

# 🧠 Sage: Local AI Training & Project Structure Guide

This guide explains the architecture, folder structure, and training process for the local AI engine that powers Sage's natural language intent classification.

---

## 🏗️ 1. Project Overview & Structure

Sage uses a **hybrid AI engine** (Regex + BERT-Tiny) that runs entirely on your local machine with zero network calls and zero API costs. The project is split into two main sections:

### 📁 The AI Factory (`/ai`)
This is where the model is created, trained, and evaluated using Python.
*   **`data/`**: Holds the `train.jsonl` and `eval.jsonl` files (the AI's study material).
*   **`venv/`**: The virtual environment for Python tools (PyTorch, Transformers).
*   **`output/`**: Temporary storage for the raw trained model.
*   **`generate_training_data.py`**: Creates synthetic training examples based on phrasing templates.
*   **`train_intent.py`**: The main training script that "fine-tunes" the BERT-Tiny brain.
*   **`export_onnx.py`**: shrinks and converts the brain into the high-speed **ONNX** format for the web app.

### 🚀 The Web Application (`/web`)
This is the Next.js app that performs the actual AI processing during chat.
*   **`models/sage-intent/`**: Contains the final 4.3MB `model.onnx` file and its tokenizer configuration.
*   **`src/shared/local-ai.ts`**: The core logic that combines regex patterns with the ML model for robust intent detection.
*   **`src/app/api/ai/`**: The backend routes that handle chat, categorization, and editing requests.

---

## 🛠️ 2. Environment Setup

To retrain the model, you need a Python 3.9+ environment.

```bash
cd ai
# Create and activate the virtual environment
python3 -m venv venv
source venv/bin/activate

# Install the necessary libraries
pip install -r requirements.txt
```

---

## 🏋️ 3. The 3-Step Training Pipeline

If you want to make the AI smarter or add support for new types of phrasing, follow these steps in order:

### Phase 1: Generate Data
Modify `generate_training_data.py` if you want to add new phrases, and then run:
```bash
python generate_training_data.py
```
*Creates ~1,200 examples with an 80/20 split between training and evaluation.*

### Phase 2: Train the Brain
Run the fine-tuning script to train the `bert-tiny` architecture:
```bash
python train_intent.py
```
*This typically takes ~3-5 minutes on a modern CPU. Look for an "Accuracy" score at the end (>65% is good).*

### Phase 3: Package for the Web
Convert and quantize the model to the high-performance ONNX format:
```bash
python export_onnx.py
```
*This automatically moves the finished files into `web/models/sage-intent/`.*

---

## 🧩 4. Understanding the Logic

### Does training increase the file size?
**No.** The structural "brain" (`bert-tiny`) has a fixed number of parameters (4.4M). Training only changes the *values* of those parameters to make them more accurate. The file will remain around **4.3MB** regardless of how many thousands of examples you train it on.

### Regex vs. Machine Learning
The engine uses a **5-layer processing stack**:
1.  **Regex Pre-pass**: Instantly catches 80% of common phrases (e.g., "spent 5.00 on coffee").
2.  **ONNX Intent Classifier**: The ML model kicks in for conversational phrasing where regex might fail.
3.  **Entity Extraction**: Robust patterns extract currency amounts, categories, dates, and notes.
4.  **Semantic Matcher**: Automatically links user notes to existing transaction IDs.
5.  **Template Engine**: Generates professional, human-like responses based on the results.

---

## 🗺️ Quick Reference Table

| Task | Location | Command |
| :--- | :--- | :--- |
| **Reset Env** | `/ai` | `source venv/bin/activate` |
| **New Data** | `/ai` | `python generate_training_data.py` |
| **Train AI** | `/ai` | `python train_intent.py` |
| **Export ONNX**| `/ai` | `python export_onnx.py` |
| **Run Web App**| `/web`| `npm run dev` |

---

## 📦 5. Managing Large Model Files

To keep the repository lightweight and stay within GitHub's file size limits, we follow a specific strategy for the AI models:

*   **Ignored Files**: The raw model weights (e.g., `ai/model_cache/model.safetensors`, `ai/bert_tiny_cache/pytorch_model.bin`) are excluded via `.gitignore`. These files are only needed during the training/fine-tuning phase.
*   **Tracked Files**: Only the **optimized ONNX models** in `web/models/sage-intent/` are tracked. These are ready for production use and are small enough (~4.3MB) for normal git operations.

### How to get the raw models?
If you need to retrain the model, you can download the base weights directly from Hugging Face or run the `generate_training_data.py` scripts to recreate the environment. The scripts are designed to download the necessary base models automatically when run.

---
*Created for the Sage Project documentation.*
