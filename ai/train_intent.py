"""
Fine-tune DistilBERT for Sage Intent Classification

5-class text classification:
  0: add_expense
  1: add_income
  2: edit_expense
  3: edit_income
  4: query

Usage:
  cd /home/dinuka/Projects/sage/ai
  pip install -r requirements.txt
  python generate_training_data.py
  python train_intent.py
"""

import json
import os
import numpy as np
from datasets import Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)

LABEL2ID = {
    "add_expense": 0,
    "add_income": 1,
    "edit_expense": 2,
    "edit_income": 3,
    "query": 4,
}
ID2LABEL = {v: k for k, v in LABEL2ID.items()}
MODEL_NAME = "bert_tiny_cache"
OUTPUT_DIR = "output/sage-intent"


def load_jsonl(path: str):
    texts, labels = [], []
    with open(path) as f:
        for line in f:
            item = json.loads(line)
            texts.append(item["text"])
            labels.append(LABEL2ID[item["label"]])
    return texts, labels


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    accuracy = (predictions == labels).astype(float).mean()
    return {"accuracy": accuracy}


def main():
    print(f"Loading tokenizer: {MODEL_NAME}")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    print("Loading training data...")
    train_texts, train_labels = load_jsonl("data/train.jsonl")
    eval_texts, eval_labels = load_jsonl("data/eval.jsonl")

    print(f"Train: {len(train_texts)} | Eval: {len(eval_texts)}")

    # Tokenize
    train_encodings = tokenizer(train_texts, truncation=True, padding=True, max_length=64)
    eval_encodings = tokenizer(eval_texts, truncation=True, padding=True, max_length=64)

    train_dataset = Dataset.from_dict({
        **train_encodings,
        "labels": train_labels,
    })
    eval_dataset = Dataset.from_dict({
        **eval_encodings,
        "labels": eval_labels,
    })

    print(f"Loading model: {MODEL_NAME}")
    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(LABEL2ID),
        id2label=ID2LABEL,
        label2id=LABEL2ID,
    )

    training_args = TrainingArguments(
        output_dir=OUTPUT_DIR,
        num_train_epochs=5,
        per_device_train_batch_size=16,
        per_device_eval_batch_size=32,
        warmup_steps=50,
        weight_decay=0.01,
        learning_rate=3e-5,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        logging_steps=20,
        report_to="none",
        seed=42,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        compute_metrics=compute_metrics,
    )

    print("\n--- Starting Training ---\n")
    trainer.train()

    print("\n--- Final Evaluation ---\n")
    results = trainer.evaluate()
    print(f"Accuracy: {results['eval_accuracy']:.4f}")
    print(f"Loss: {results['eval_loss']:.4f}")

    # Save the best model
    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)

    # Save label mapping
    label_map = {"label2id": LABEL2ID, "id2label": ID2LABEL}
    with open(os.path.join(OUTPUT_DIR, "label_map.json"), "w") as f:
        json.dump(label_map, f, indent=2)

    print(f"\nModel saved to: {OUTPUT_DIR}/")
    print("Next step: python export_onnx.py")


if __name__ == "__main__":
    main()
