import json
import os

from PIL import Image, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_DIR = os.path.join(BASE_DIR, "Photo")
THUMB_SRC_DIR = os.path.join(PHOTO_DIR, "thumbnail")
SOUND_DIR = os.path.join(BASE_DIR, "Sound")
PHOTOS_OUT_DIR = os.path.join(BASE_DIR, "assets", "photos")
OG_IMAGE_PATH = os.path.join(BASE_DIR, "assets", "og-image.jpg")
MANIFEST_PATH = os.path.join(BASE_DIR, "assets", "manifest.json")

PHOTO_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
AUDIO_EXTS = {".mp3", ".m4a", ".ogg"}

GALLERY_MAX_WIDTH = 1600
GALLERY_QUALITY = 82
OG_SIZE = (1200, 630)
OG_QUALITY = 85


def list_files(directory, exts):
    if not os.path.isdir(directory):
        return []
    return sorted(
        f for f in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, f)) and os.path.splitext(f)[1].lower() in exts
    )


def load_image(path):
    return ImageOps.exif_transpose(Image.open(path).convert("RGB"))


def save_gallery_photo(src_path, out_name):
    img = load_image(src_path)
    if img.width > GALLERY_MAX_WIDTH:
        ratio = GALLERY_MAX_WIDTH / img.width
        img = img.resize((GALLERY_MAX_WIDTH, int(img.height * ratio)), Image.LANCZOS)
    img.save(os.path.join(PHOTOS_OUT_DIR, out_name), quality=GALLERY_QUALITY, optimize=True)


def save_og_image(src_path):
    img = load_image(src_path)
    target_w, target_h = OG_SIZE
    target_ratio = target_w / target_h
    src_ratio = img.width / img.height

    if src_ratio > target_ratio:
        new_w = int(img.height * target_ratio)
        left = (img.width - new_w) // 2
        img = img.crop((left, 0, left + new_w, img.height))
    else:
        new_h = int(img.width / target_ratio)
        top = (img.height - new_h) // 2
        img = img.crop((0, top, img.width, top + new_h))

    img = img.resize(OG_SIZE, Image.LANCZOS)
    img.save(OG_IMAGE_PATH, quality=OG_QUALITY, optimize=True)


def main():
    os.makedirs(PHOTOS_OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)

    for f in os.listdir(PHOTOS_OUT_DIR):
        os.remove(os.path.join(PHOTOS_OUT_DIR, f))

    gallery_files = list_files(PHOTO_DIR, PHOTO_EXTS)
    processed_names = []
    for f in gallery_files:
        out_name = os.path.splitext(f)[0] + ".jpg"
        save_gallery_photo(os.path.join(PHOTO_DIR, f), out_name)
        processed_names.append(out_name)

    thumb_files = list_files(THUMB_SRC_DIR, PHOTO_EXTS)
    if thumb_files:
        save_og_image(os.path.join(THUMB_SRC_DIR, thumb_files[0]))

    manifest = {
        "photos": sorted(processed_names),
        "bgm": list_files(SOUND_DIR, AUDIO_EXTS),
    }
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"갤러리 사진 {len(processed_names)}개 리사이즈 완료 (assets/photos)")
    print(f"BGM {len(manifest['bgm'])}개")
    if thumb_files:
        print(f"카카오톡 썸네일: Photo/thumbnail/{thumb_files[0]} 사용 -> assets/og-image.jpg")
        if len(thumb_files) > 1:
            print(f"  (Photo/thumbnail/에 사진이 {len(thumb_files)}개 있어서 이 중 첫 번째 파일만 사용했습니다)")
    else:
        print("경고: Photo/thumbnail/ 폴더에 사진이 없어 og-image.jpg를 갱신하지 못했습니다.")


if __name__ == "__main__":
    main()
