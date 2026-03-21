# Local AI Model Training Guide

This guide describes how to improve the performance of your local AI intent and categorization models.

## 1. Improving Categorization (Metadata/Intents)

If the model miscategorizes items (e.g., "dress" as `other` instead of `fashion`), or fails to detect an expense (e.g., "5k on water bill"), you should update the training dataset.

### Steps to Update Dataset:
1.  **Navigate to the AI directory**:
    ```bash
    cd ai/data
    ```
2.  **Edit `intents.json` (or similar data file)**:
    - Add examples that clearly map the failing phrase to the correct intent.
    - Example for a dress:
      ```json
      { "text": "Bought a new dress for the party", "intent": "add_expense", "category": "fashion" }
      ```
    - Example for a high-value bill:
      ```json
      { "text": "5000 on water bill", "intent": "add_expense", "category": "bills" }
      ```

3.  **Run Data Augmentation (Optional)**:
    If you have a script for expanding data:
    ```bash
    python3 ai/generate_training_data.py
    ```

## 2. Improving Number Parsing (Words to Digits)

The current model uses a combination of regex and NLP. To improve parsing of words like "Fifty thousand":

1.  **Update `shared/utils.ts` or `ai/utils.py`**:
    Look for the logic that extracts amounts. You can add a library like `word-to-number` (JS) or `word2number` (Python) or add manual mappings for common currency terms.
2.  **Add examples to `intents.json`**:
    Include training phrases with spelled-out numbers to help the model identify the `amount` slot.

## 3. Retraining the Model

Once you have updated the data:

1.  **Run the training script**:
    ```bash
    python3 ai/train_intent.py
    ```
2.  **Export to ONNX**:
    If your web app uses ONNX runtime:
    ```bash
    python3 ai/export_onnx.py
    ```
3.  **Update the web app**:
    Copy the generated model files from `ai/output/` to `web/public/model/` (or wherever your model is served from).

## 4. Testing Locally

Before pushing, use a scratch script to verify:
```bash
node ai/scripts/test-intent.ts "fifty thousand for the rent"
```
