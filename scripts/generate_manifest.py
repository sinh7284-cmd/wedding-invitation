import hashlib
import json
import os
import re
import shutil

from PIL import Image, ImageOps

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_DIR = os.path.join(BASE_DIR, "Photo")
THUMB_SRC_DIR = os.path.join(PHOTO_DIR, "thumbnail")   # 카카오톡 공유 썸네일용 (1장)
HERO_SRC_DIR = os.path.join(PHOTO_DIR, "main")         # 첫 화면 대형 사진용 (1장)
VIDEO_DIR = os.path.join(PHOTO_DIR, "video")           # 갤러리 영상 (50MB 이하 권장)
SOUND_DIR = os.path.join(BASE_DIR, "Sound")
PHOTOS_OUT_DIR = os.path.join(BASE_DIR, "assets", "photos")
OG_IMAGE_PATH = os.path.join(BASE_DIR, "assets", "og-image.jpg")
HERO_IMAGE_PATH = os.path.join(BASE_DIR, "assets", "hero.jpg")
MANIFEST_PATH = os.path.join(BASE_DIR, "assets", "manifest.json")
OG_HASH_PATH = os.path.join(BASE_DIR, "assets", "og-image.hash")
INDEX_PATH = os.path.join(BASE_DIR, "index.html")

PHOTO_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
AUDIO_EXTS = {".mp3", ".m4a", ".ogg"}
VIDEO_EXTS = {".mp4", ".webm"}

GALLERY_MAX_WIDTH = 1600
GALLERY_QUALITY = 82
HERO_MAX_WIDTH = 1080
HERO_QUALITY = 84
# 카카오톡 미리보기가 이미지를 자르지 않도록 2:1 비율 + 여백(contain) 방식 사용
OG_SIZE = (800, 400)
OG_QUALITY = 85
OG_BG_COLOR = (250, 246, 236)  # 청첩장 배경과 같은 크림색

VIDEO_WARN_MB = 50


def list_files(directory, exts):
    if not os.path.isdir(directory):
        return []
    return sorted(
        f for f in os.listdir(directory)
        if os.path.isfile(os.path.join(directory, f)) and os.path.splitext(f)[1].lower() in exts
    )


def load_image(path):
    return ImageOps.exif_transpose(Image.open(path).convert("RGB"))


def save_resized(src_path, out_path, max_width, quality):
    img = load_image(src_path)
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)
    img.save(out_path, quality=quality, optimize=True)


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


def bump_og_version_if_changed():
    # 썸네일(og-image.jpg) 내용이 이전과 달라졌으면 index.html의
    # "og-image.jpg?v=숫자"를 1 올린다. 카카오톡이 이미지를 주소 기준으로
    # 캐시하기 때문에, 주소가 바뀌어야 새 썸네일을 가져간다.
    with open(OG_IMAGE_PATH, "rb") as f:
        new_hash = hashlib.md5(f.read()).hexdigest()

    old_hash = None
    if os.path.exists(OG_HASH_PATH):
        with open(OG_HASH_PATH, "r", encoding="utf-8") as f:
            old_hash = f.read().strip()

    if new_hash == old_hash:
        return False

    with open(OG_HASH_PATH, "w", encoding="utf-8") as f:
        f.write(new_hash)

    if old_hash is None:
        # 첫 실행: 기준 해시만 기록하고 버전은 올리지 않는다.
        return False

    with open(INDEX_PATH, "r", encoding="utf-8") as f:
        html = f.read()
    html, n = re.subn(
        r"og-image\.jpg\?v=(\d+)",
        lambda m: f"og-image.jpg?v={int(m.group(1)) + 1}",
        html,
    )
    if n > 0:
        with open(INDEX_PATH, "w", encoding="utf-8", newline="") as f:
            f.write(html)
    return n > 0


def main():
    os.makedirs(PHOTOS_OUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)

    for f in os.listdir(PHOTOS_OUT_DIR):
        os.remove(os.path.join(PHOTOS_OUT_DIR, f))

    # 갤러리 사진
    gallery_files = list_files(PHOTO_DIR, PHOTO_EXTS)
    processed_names = []
    for f in gallery_files:
        out_name = os.path.splitext(f)[0] + ".jpg"
        save_resized(os.path.join(PHOTO_DIR, f), os.path.join(PHOTOS_OUT_DIR, out_name),
                     GALLERY_MAX_WIDTH, GALLERY_QUALITY)
        processed_names.append(out_name)

    # 카카오톡 썸네일
    thumb_files = list_files(THUMB_SRC_DIR, PHOTO_EXTS)
    og_version_bumped = False
    if thumb_files:
        save_og_image(os.path.join(THUMB_SRC_DIR, thumb_files[0]))
        og_version_bumped = bump_og_version_if_changed()

    # 첫 화면 대형 사진
    hero_files = list_files(HERO_SRC_DIR, PHOTO_EXTS)
    has_hero = bool(hero_files)
    if has_hero:
        save_resized(os.path.join(HERO_SRC_DIR, hero_files[0]), HERO_IMAGE_PATH,
                     HERO_MAX_WIDTH, HERO_QUALITY)

    # 첫 화면 영상 (Photo/main에 mp4를 넣으면 사진 대신 영상이 배경으로 재생됨)
    assets_dir = os.path.dirname(MANIFEST_PATH)
    for f in os.listdir(assets_dir):
        name, ext = os.path.splitext(f)
        if name == "hero" and ext.lower() in VIDEO_EXTS:
            os.remove(os.path.join(assets_dir, f))
    hero_video_files = list_files(HERO_SRC_DIR, VIDEO_EXTS)
    hero_video = None
    if hero_video_files:
        src_name = hero_video_files[0]
        ext = os.path.splitext(src_name)[1].lower()
        hero_video = "hero" + ext
        src_path = os.path.join(HERO_SRC_DIR, src_name)
        shutil.copyfile(src_path, os.path.join(assets_dir, hero_video))
        size_mb = os.path.getsize(src_path) / (1024 * 1024)
        if size_mb > 15:
            print(f"경고: 메인 영상 {src_name} ({size_mb:.0f}MB)이 큽니다. "
                  f"첫 화면 로딩이 느려지니 15MB 이하로 줄이는 것을 권장합니다.")

    # 갤러리 영상
    video_files = list_files(VIDEO_DIR, VIDEO_EXTS)
    for v in video_files:
        size_mb = os.path.getsize(os.path.join(VIDEO_DIR, v)) / (1024 * 1024)
        if size_mb > VIDEO_WARN_MB:
            print(f"경고: Photo/video/{v} ({size_mb:.0f}MB)는 {VIDEO_WARN_MB}MB를 넘습니다. "
                  f"GitHub 업로드가 거부될 수 있으니 용량을 줄여주세요.")

    manifest = {
        "hero": "hero.jpg" if has_hero else None,
        "heroVideo": hero_video,
        "photos": sorted(processed_names),
        "videos": video_files,
        "bgm": list_files(SOUND_DIR, AUDIO_EXTS),
    }
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"갤러리 사진 {len(processed_names)}개 리사이즈 완료 (assets/photos)")
    print(f"갤러리 영상 {len(video_files)}개 (Photo/video)")
    print(f"BGM {len(manifest['bgm'])}개")
    if has_hero:
        print(f"메인 사진: Photo/main/{hero_files[0]} -> assets/hero.jpg")
    else:
        print("경고: Photo/main/ 폴더에 사진이 없어 메인 대형 사진을 만들지 못했습니다.")
    if hero_video:
        print(f"메인 영상: Photo/main/{hero_video_files[0]} -> assets/{hero_video} (사진 대신 영상 재생)")
    if thumb_files:
        print(f"카카오톡 썸네일: Photo/thumbnail/{thumb_files[0]} -> assets/og-image.jpg")
        if og_version_bumped:
            print("썸네일이 바뀌어 index.html의 og:image 버전 번호를 자동으로 올렸습니다.")
    else:
        print("경고: Photo/thumbnail/ 폴더에 사진이 없어 og-image.jpg를 갱신하지 못했습니다.")


if __name__ == "__main__":
    main()
