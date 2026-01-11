"""
YouTube Shorts 影片下載腳本
下載 Lesson 1 的 4 個教學影片
"""

import os
import subprocess
import sys

# YouTube Shorts URLs (原始連結)
VIDEOS = {
    'step1.mp4': 'https://youtube.com/shorts/LaKpMsKzAlI',  # 你好
    'step2.mp4': 'https://youtube.com/shorts/7l51ah8ktKc',  # 我是學生
    'step3.mp4': 'https://youtube.com/shorts/mpZIUhuH3Tc',  # 造句練習
    'step4.mp4': 'https://youtube.com/shorts/5Fj8E7EhJxQ',  # 綜合複習
}

# 輸出目錄
OUTPUT_DIR = r'apps\web\public\videos\lessons\L1'

def check_yt_dlp():
    """檢查 yt-dlp 是否已安裝"""
    try:
        subprocess.run(['yt-dlp', '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_yt_dlp():
    """安裝 yt-dlp"""
    print("📦 正在安裝 yt-dlp...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-U', 'yt-dlp'], check=True)
        print("✅ yt-dlp 安裝成功！")
        return True
    except subprocess.CalledProcessError:
        print("❌ yt-dlp 安裝失敗")
        return False

def download_video(url, output_path):
    """下載單個影片"""
    print(f"\n📥 下載: {os.path.basename(output_path)}")
    print(f"🔗 URL: {url}")
    
    try:
        # yt-dlp 下載參數
        cmd = [
            'yt-dlp',
            '-f', 'best[ext=mp4]/best',  # 優先下載 MP4，否則下載最佳格式
            '--output', output_path,      # 輸出路徑
            '--no-playlist',              # 不下載播放列表
            '--quiet',                    # 安靜模式
            '--progress',                 # 顯示進度
            url
        ]
        
        subprocess.run(cmd, check=True)
        print(f"✅ 下載成功: {os.path.basename(output_path)}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ 下載失敗: {os.path.basename(output_path)}")
        print(f"   錯誤: {e}")
        return False

def main():
    print("=" * 60)
    print("🎬 YouTube Shorts 影片下載器")
    print("📚 Lesson 1 - Self Introduction (4 個影片)")
    print("=" * 60)
    
    # 檢查並安裝 yt-dlp
    if not check_yt_dlp():
        print("\n⚠️  未檢測到 yt-dlp")
        if not install_yt_dlp():
            print("\n❌ 請手動安裝 yt-dlp:")
            print("   pip install -U yt-dlp")
            return
    
    # 確保輸出目錄存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n📁 輸出目錄: {OUTPUT_DIR}")
    
    # 下載所有影片
    success_count = 0
    total_count = len(VIDEOS)
    
    for filename, url in VIDEOS.items():
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        # 檢查是否已存在
        if os.path.exists(output_path):
            print(f"\n⏭️  跳過 (已存在): {filename}")
            success_count += 1
            continue
        
        # 下載影片
        if download_video(url, output_path):
            success_count += 1
    
    # 顯示結果
    print("\n" + "=" * 60)
    print(f"📊 下載完成: {success_count}/{total_count} 個影片")
    print("=" * 60)
    
    if success_count == total_count:
        print("\n✅ 所有影片下載成功！")
        print(f"\n📂 影片位置: {os.path.abspath(OUTPUT_DIR)}")
        print("\n🎯 下一步:")
        print("   1. 檢查影片檔案")
        print("   2. 啟動開發伺服器: npm run dev")
        print("   3. 訪問: http://localhost:3000/lesson/L1")
    else:
        failed_count = total_count - success_count
        print(f"\n⚠️  有 {failed_count} 個影片下載失敗")
        print("\n可能的原因:")
        print("   - 網路連線問題")
        print("   - YouTube 影片已被移除或設為私人")
        print("   - 地區限制")

if __name__ == '__main__':
    main()
