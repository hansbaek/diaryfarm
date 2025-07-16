# 농사일지 📱🌱

스마트한 농업 관리를 위한 웹 애플리케이션입니다. 작물 관리, 일일 농작업 기록, 수확량 추적 등의 기능을 제공합니다.

## 🌟 주요 기능

### 📊 대시보드
- 오늘의 날씨 정보
- 예정된 농작업 목록
- 작물 현황 요약
- 최근 활동 내역

### 🌱 작물 관리
- 작물 등록 및 관리
- 파종일, 수확 예정일 추적
- 작물별 성장 진행률 표시
- 작물 상태 모니터링

### 📝 일지 작성
- 날짜별 농작업 기록
- 날씨, 온도 정보 입력
- 작업 종류별 분류
- 수확량 기록
- 상세 작업 내용 메모

### 📈 통계 및 분석
- 월별 수확량 차트
- 작물별 수확 현황
- 전체 농장 통계
- 데이터 시각화

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: 순수 CSS (반응형 디자인)
- **차트**: Chart.js
- **아이콘**: Font Awesome
- **데이터 저장**: LocalStorage
- **배포**: GitHub Pages

## 🚀 로컬 실행 방법

1. 저장소 클론
```bash
git clone https://github.com/your-username/farm-diary.git
cd farm-diary
```

2. 로컬 서버 실행
```bash
# Python 3 사용 시
python -m http.server 8000

# Python 2 사용 시
python -m SimpleHTTPServer 8000

# Node.js 사용 시 (http-server 설치 필요)
npx http-server
```

3. 브라우저에서 접속
```
http://localhost:8000
```

## 📦 GitHub Pages 배포 방법

### 1. GitHub 저장소 생성
1. GitHub에서 새 저장소 생성
2. 저장소 이름: `farm-diary` (또는 원하는 이름)
3. Public으로 설정

### 2. 코드 업로드
```bash
# Git 초기화
git init

# 파일 추가
git add .

# 커밋
git commit -m "Initial commit: 농사일지 애플리케이션"

# 원격 저장소 연결
git remote add origin https://github.com/your-username/farm-diary.git

# 푸시
git push -u origin main
```

### 3. GitHub Pages 활성화
1. GitHub 저장소 페이지에서 **Settings** 탭 클릭
2. 왼쪽 메뉴에서 **Pages** 클릭
3. **Source**에서 "Deploy from a branch" 선택
4. **Branch**에서 "main" 선택
5. **Save** 클릭

### 4. 배포 완료
- 몇 분 후 `https://your-username.github.io/farm-diary/`에서 접속 가능
- 코드 변경 시 `git push`만 하면 자동 배포

## 📱 사용 방법

### 첫 사용 시
1. **작물 관리** 탭에서 "새 작물 추가" 클릭
2. 작물 정보 입력 (이름, 파종일, 수확 예정일 등)
3. **일지 작성** 탭에서 일일 농작업 기록

### 일상적인 사용
1. **대시보드**에서 오늘 할 일 확인
2. **일지 작성**에서 농작업 내용 기록
3. **통계** 탭에서 농장 현황 분석

## 💾 데이터 저장

- 모든 데이터는 브라우저의 LocalStorage에 저장됩니다
- 브라우저 데이터를 삭제하면 기록이 사라질 수 있습니다
- 중요한 데이터는 정기적으로 백업하는 것을 권장합니다

## 🔧 커스터마이징

### 색상 테마 변경
`styles.css` 파일에서 CSS 변수를 수정하여 색상을 변경할 수 있습니다:

```css
:root {
    --primary-color: #4CAF50;  /* 메인 색상 */
    --secondary-color: #45a049; /* 보조 색상 */
    --background-color: #f5f7fa; /* 배경 색상 */
}
```

### 새로운 작업 종류 추가
`script.js` 파일에서 작업 종류 옵션을 추가할 수 있습니다:

```javascript
// handleDiarySubmit 함수 근처에서 수정
const workTypes = ['파종', '물주기', '비료', '수확', '방제', '새로운작업', '기타'];
```

## 🐛 문제 해결

### 차트가 표시되지 않는 경우
- 인터넷 연결 확인 (Chart.js CDN 로드 필요)
- 브라우저 콘솔에서 오류 메시지 확인

### 데이터가 저장되지 않는 경우
- 브라우저의 LocalStorage 지원 여부 확인
- 시크릿/프라이빗 모드에서는 데이터가 저장되지 않을 수 있음

### 모바일에서 레이아웃이 깨지는 경우
- 브라우저 캐시 삭제 후 새로고침
- 최신 브라우저 사용 권장

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 연락처

프로젝트 링크: [https://github.com/your-username/farm-diary](https://github.com/your-username/farm-diary)

---

**즐거운 농사일지 작성하세요! 🌾**