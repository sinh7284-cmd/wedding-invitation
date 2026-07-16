import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_DIR = os.path.join(BASE_DIR, "Photo")
SOUND_DIR = os.path.join(BASE_DIR, "Sound")
OUTPUT_PATH = os.path.join(BASE_DIR, "assets", "manifest.json")

PHOTO_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
AUDIO_EXTS = {".mp3", ".m4a", ".ogg"}


def list_files(directory, exts):
    if not os.path.isdir(directory):
        return []
    return sorted(
        f for f in os.listdir(directory)
        if os.path.splitext(f)[1].lower() in exts
    )


def main():
    manifest = {
        "photos": list_files(PHOTO_DIR, PHOTO_EXTS),
        "bgm": list_files(SOUND_DIR, AUDIO_EXTS),
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"사진 {len(manifest['photos'])}개, BGM {len(manifest['bgm'])}개 -> assets/manifest.json 생성 완료")


if __name__ == "__main__":
    main()
