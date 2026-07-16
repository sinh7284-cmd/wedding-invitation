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
# 카카오톡 미리보기가 이미지를 자르지 않도록 2:1 비율 + 여백(contain) 방식 사용
OG_SIZE = (800, 400)
OG_QUALITY = 85
OG_BG_COLOR = (250, 246, 236)  # 청첩장 배경과 같은 크림색


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
    # 사진을 자르지 않고 2:1 캔버스 안에 통째로 넣는다 (남는 부분은 크림색 여백).
    img = load_image(src_path)
    target_w, target_h = OG_SIZE

    ratio = min(target_w / img.width, target_h / img.height)
    fit_w = int(img.width * ratio)
    fit_h = int(img.height * ratio)
    img = img.resize((fit_w, fit_h), Image.LANCZOS)

    canvas = Image.new("RGB", OG_SIZE, OG_BG_COLOR)
    canvas.paste(img, ((target_w - fit_w) // 2, (target_h - fit_h) // 2))
    canvas.save(OG_IMAGE_PATH, quality=OG_QUALITY, optimize=True)


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
