"""
Export fine-tuned DistilBERT to ONNX for Node.js runtime

Exports:
  - web/models/sage-intent/model.onnx (quantized INT8)
  - web/models/sage-intent/tokenizer.json
  - web/models/sage-intent/config.json
  - web/models/sage-intent/label_map.json

Usage:
  cd /home/dinuka/Projects/sage/ai
  python export_onnx.py
"""

import json
import os
import shutil
from pathlib import Path
from optimum.onnxruntime import ORTModelForSequenceClassification
from optimum.onnxruntime.configuration import AutoQuantizationConfig
from optimum.exporters.onnx import main_export
from transformers import AutoTokenizer

SOURCE_DIR = "output/sage-intent"
DEST_DIR = "../web/models/sage-intent"


def main():
    print("Exporting model to ONNX...")

    dest = Path(DEST_DIR)
    dest.mkdir(parents=True, exist_ok=True)

    # Export to ONNX
    main_export(
        model_name_or_path=SOURCE_DIR,
        output=DEST_DIR,
        task="text-classification",
        opset=17,
    )

    print("Quantizing to INT8...")

    # Load and quantize
    qconfig = AutoQuantizationConfig.avx512_vnni(is_static=False)
    model = ORTModelForSequenceClassification.from_pretrained(
        DEST_DIR,
        file_name="model.onnx",
    )
    quantized_dir = str(dest / "quantized")
    model.save_pretrained(quantized_dir)

    # Try dynamic quantization
    try:
        from optimum.onnxruntime import ORTQuantizer
        quantizer = ORTQuantizer.from_pretrained(DEST_DIR)
        quantizer.quantize(save_dir=quantized_dir, quantization_config=qconfig)
        # Move quantized model back
        quantized_model = Path(quantized_dir) / "model_quantized.onnx"
        if quantized_model.exists():
            shutil.move(str(quantized_model), str(dest / "model.onnx"))
            print("Using quantized model")
        shutil.rmtree(quantized_dir, ignore_errors=True)
    except Exception as e:
        print(f"Quantization optional step skipped: {e}")
        print("Using unquantized model (still works fine)")
        shutil.rmtree(quantized_dir, ignore_errors=True)

    # Copy tokenizer files
    tokenizer = AutoTokenizer.from_pretrained(SOURCE_DIR)
    tokenizer.save_pretrained(DEST_DIR)

    # Copy label map
    label_map_src = os.path.join(SOURCE_DIR, "label_map.json")
    if os.path.exists(label_map_src):
        shutil.copy2(label_map_src, os.path.join(DEST_DIR, "label_map.json"))

    # List output files
    print(f"\nExported files in {DEST_DIR}:")
    total_size = 0
    for f in sorted(os.listdir(DEST_DIR)):
        fpath = os.path.join(DEST_DIR, f)
        if os.path.isfile(fpath):
            size = os.path.getsize(fpath)
            total_size += size
            print(f"  {f}: {size / 1024 / 1024:.1f} MB")

    print(f"\nTotal size: {total_size / 1024 / 1024:.1f} MB")
    print("\nDone! Model is ready for Node.js runtime.")


if __name__ == "__main__":
    main()
