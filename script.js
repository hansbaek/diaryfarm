// 농사일지 애플리케이션 JavaScript

// Dexie.js DB 정의
const db = new Dexie('FarmDiaryDB');
db.version(1).stores({
    crops: '++id, name, plantDate, expectedHarvest, notes',
    diaries: '++id, date, weather, temperature, workType, crop, harvestAmount, workDescription',
    tasks: '++id, date, text, completed, isAuto',
    autoTaskCompleted: '++id, date, taskId',
    autoTaskDeleted: '++id, date, taskId'
});

// 데이터 캐시
let crops = [];
let diaries = [];
let tasks = [];
let autoTaskCompleted = [];
let autoTaskDeleted = [];

// 차트 인스턴스 (전역 변수로 관리하여 재사용 전 파괴)
let harvestChartInstance = null;
let cropChartInstance = null;

// 오늘 날짜 키
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

// DB에서 데이터 불러오기
async function loadAllData() {
    crops = await db.crops.toArray();
    diaries = await db.diaries.toArray();
    tasks = await db.tasks.toArray();
    autoTaskCompleted = await db.autoTaskCompleted.where('date').equals(getTodayKey()).toArray();
    autoTaskDeleted = await db.autoTaskDeleted.where('date').equals(getTodayKey()).toArray();
}

// DB에 데이터 저장 (추가/수정/삭제)
async function addCrop(crop) {
    await db.crops.add(crop);
    await loadAllData();
    loadCrops();
    updateCropSelect();
}
async function addDiary(diary) {
    await db.diaries.add(diary);
    await loadAllData();
    loadDiaryHistory();
}
async function addTask(task) {
    await db.tasks.add(task);
    await loadAllData();
    updateTodayTasks();
}
async function updateTask(task) {
    await db.tasks.put(task);
    await loadAllData();
    updateTodayTasks();
}
async function deleteTaskById(taskId) {
    await db.tasks.delete(taskId);
    await loadAllData();
    updateTodayTasks();
}
async function addAutoTaskCompleted(taskId) {
    await db.autoTaskCompleted.add({date: getTodayKey(), taskId});
    await loadAllData();
    updateTodayTasks();
}
async function removeAutoTaskCompleted(taskId) {
    await db.autoTaskCompleted.where({date: getTodayKey(), taskId}).delete();
    await loadAllData();
    updateTodayTasks();
}
async function addAutoTaskDeleted(taskId) {
    await db.autoTaskDeleted.add({date: getTodayKey(), taskId});
    await loadAllData();
    updateTodayTasks();
    showMessage('자동 할 일이 삭제되었습니다.', 'success');
}

// 오늘 날짜 설정
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    const diaryDateInput = document.getElementById('diaryDate');
    if (diaryDateInput) {
        diaryDateInput.value = today;
    }
}

// DOM 로드 완료 시 초기화 (setupForms에서 handleAddCrop 대신 saveCrop 호출)
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllData();
    initializeApp();
});

// 애플리케이션 초기화 (setupForms에서 saveCrop 사용)
function initializeApp() {
    setupNavigation();
    setupForms();
    loadDashboard();
    loadCrops();
    loadDiaryHistory();
    loadStatistics();
    setTodayDate();
    updateCropSelect();
}

// 네비게이션 설정 (데이터 관리 메뉴 포함)
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('href').substring(1);
            showSection(targetSection);
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// 섹션 표시
function showSection(sectionName) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 선택된 섹션 표시
    document.getElementById(sectionName).classList.add('active');
    currentSection = sectionName;
    
    // 섹션별 데이터 새로고침
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'crops') {
        setupCropsManageYearSelect();
        loadCrops();
    } else if (sectionName === 'diary') {
        loadDiaryHistory();
    } else if (sectionName === 'statistics') {
        loadStatistics();
    }
}

// 폼 설정 (handleAddCrop 대신 saveCrop으로 이벤트 리스너 변경)
function setupForms() {
    // 일지 작성 폼
    const diaryForm = document.getElementById('diaryForm');
    if (diaryForm) {
        diaryForm.addEventListener('submit', saveDiary);
    }
    
    // 작물 추가/수정 폼
    const addCropForm = document.getElementById('addCropForm');
    if (addCropForm) {
        addCropForm.addEventListener('submit', saveCrop);
    }
}

// 주요 도시(지점번호) 기본값
const DEFAULT_STN = localStorage.getItem('weatherStation') || '236';

// 기존 날씨 관련 코드 완전 삭제 및 기상청 단기예보 기반 코드로 교체

// 도시별 격자 좌표
const cityGrid = {
  '236': {name: '서천', nx: 55, ny: 110},
  '235': {name: '부여', nx: 62, ny: 110},
  '133': {name: '대전', nx: 67, ny: 100},
  '108': {name: '서울', nx: 60, ny: 127}
};

// 날씨 조회 함수
async function fetchWeather() {
  const cityCode = document.getElementById('weatherStation').value;
  const grid = cityGrid[cityCode];
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const date = `${yyyy}${mm}${dd}`;
  const hour = String(today.getHours()).padStart(2, '0');

  function getBaseTime(hour) {
    const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
    let h = parseInt(hour, 10);
    let base = baseTimes[0];
    for (let i = 0; i < baseTimes.length; i++) {
      if (h >= baseTimes[i]) base = baseTimes[i];
    }
    return String(base).padStart(2, '0') + '00';
  }

  let baseDate = date;
  let baseTime = getBaseTime(hour);
  if (parseInt(hour, 10) < 2) {
    const yest = new Date(today.getTime() - 86400000);
    baseDate = `${yest.getFullYear()}${String(yest.getMonth() + 1).padStart(2, '0')}${String(yest.getDate()).padStart(2, '0')}`;
    baseTime = '2300';
  }

  const serviceKey = encodeURIComponent("l6byE/b5ABXDerK1U6WxM8ssGkVYIzG8DxoujiMEliXrg25rZzUDlBSA7XmHaptyGlrEH7x+S8ZZPvlRT0DBdQ==");
  const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${serviceKey}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${grid.nx}&ny=${grid.ny}`;
  const weatherInfoDiv = document.querySelector('.weather-info');
  weatherInfoDiv.innerHTML = "조회 중...";
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.response.header.resultCode !== "00") {
      weatherInfoDiv.innerHTML = "API 오류: " + data.response.header.resultMsg;
      return;
    }
    const items = data.response.body.items.item;
    if (!items || items.length === 0) {
      weatherInfoDiv.innerHTML = "데이터가 없습니다.";
      return;
    }
    const fcstMap = {};
    for (const item of items) {
      if (!fcstMap[item.fcstTime]) fcstMap[item.fcstTime] = {};
      fcstMap[item.fcstTime][item.category] = item.fcstValue;
    }
    const nowHHMM = hour + '00';
    let targetTime = null;
    for (const t of Object.keys(fcstMap).sort()) {
      if (t >= nowHHMM) { targetTime = t; break; }
    }
    if (!targetTime) targetTime = Object.keys(fcstMap).sort().pop();
    const fcst = fcstMap[targetTime];
    const year = baseDate.substring(2, 4);
    const month = parseInt(baseDate.substring(4, 6), 10);
    const day = parseInt(baseDate.substring(6, 8), 10);
    const forecastDateTime = `${year}년 ${month}월 ${day}일 ${targetTime.substring(0, 2)}:${targetTime.substring(2, 4)}`;
    weatherInfoDiv.innerHTML = `
      <div class="weather-details">
        <div class="weather-detail">
          <span class="icon"><i class="fas fa-clock"></i></span>
          <span class="label">예보시각</span>
          <span class="value">${forecastDateTime}</span>
        </div>
        <div class="weather-detail">
          <span class="icon"><i class="fas fa-temperature-high"></i></span>
          <span class="label">기온(°C)</span>
          <span class="value">${fcst.TMP ?? '-'}</span>
        </div>
        <div class="weather-detail">
          <span class="icon"><i class="fas fa-cloud-rain"></i></span>
          <span class="label">강수량(mm)</span>
          <span class="value">${fcst.PCP ?? '-'}</span>
        </div>
        <div class="weather-detail">
          <span class="icon"><i class="fas fa-tint"></i></span>
          <span class="label">습도(%)</span>
          <span class="value">${fcst.REH ?? '-'}</span>
        </div>
        <div class="weather-detail">
          <span class="icon"><i class="fas fa-wind"></i></span>
          <span class="label">풍속(m/s)</span>
          <span class="value">${fcst.WSD ?? '-'}</span>
        </div>
      </div>
    `;
  } catch (e) {
    weatherInfoDiv.innerHTML = "조회 실패: " + e;
    if (e instanceof TypeError && e.message.includes('Failed to fetch')) {
      weatherInfoDiv.innerHTML += "<br>※ CORS 오류 발생 시 프록시 서버(cors-anywhere 등) 활성화 필요";
    }
  }
}

// 대시보드 로드시 날씨 정보 조회
function loadDashboard() {
  fetchWeather();
  updateTodayTasks();
  setupCropYearSelect();
  updateCropsSummary();
  updateRecentActivity();
  checkHarvestReminders();
}

// 도시 선택 변경 시 날씨 정보 갱신
window.addEventListener('DOMContentLoaded', function() {
  const weatherStation = document.getElementById('weatherStation');
  if (weatherStation) {
    weatherStation.addEventListener('change', fetchWeather);
    fetchWeather();
  }
});

// 오늘 할 일 업데이트
function updateTodayTasks() {
    const taskList = document.getElementById('taskList');
    const today = new Date().toISOString().split('T')[0];
    
    // 오늘 날짜의 할 일들 필터링
    const todayTasks = tasks.filter(task => task.date === today);
    
    // 자동 생성된 작업들 (작물 기반)
    const autoTasks = crops.filter(crop => {
        const plantDate = new Date(crop.plantDate);
        const daysSincePlant = Math.floor((new Date() - plantDate) / (1000 * 60 * 60 * 24));
        return daysSincePlant % 3 === 0; // 3일마다 물주기
    }).map(crop => ({
        id: `auto-${crop.id}`,
        text: `${crop.name} 물주기`,
        completed: false,
        isAuto: true
    }));
    
    // 삭제된 자동 할일은 제외
    const filteredAutoTasks = autoTasks.filter(task => !autoTaskDeleted[today]?.includes(task.id));
    const allTasks = [...todayTasks, ...filteredAutoTasks];
    
    if (allTasks.length === 0) {
        taskList.innerHTML = '<li style="text-align: center; color: #888; padding: 1rem;">오늘 할 일이 없습니다.</li>';
    } else {
        taskList.innerHTML = allTasks.map(task => createTaskItem(task)).join('');
    }
}

// 작물 요약 업데이트
function updateCropsSummary() {
    const totalCropsElement = document.querySelector('.crops-summary .stat .number');
    const upcomingHarvestElement = document.querySelectorAll('.crops-summary .stat .number')[1];
    
    if (totalCropsElement) {
        totalCropsElement.textContent = crops.length;
    }
    
    // 수확 예정 작물 계산
    const upcomingHarvests = crops.filter(crop => {
        if (!crop.expectedHarvest) return false;
        const harvestDate = new Date(crop.expectedHarvest);
        const today = new Date();
        const daysUntilHarvest = Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilHarvest >= 0 && daysUntilHarvest <= 30;
    }).length;
    
    if (upcomingHarvestElement) {
        upcomingHarvestElement.textContent = upcomingHarvests;
    }
}

// 최근 활동 업데이트
function updateRecentActivity() {
    const activityList = document.querySelector('.activity-list');
    const recentDiaries = diaries.slice(-3).reverse();
    
    if (recentDiaries.length === 0) {
        activityList.innerHTML = '<li>아직 기록된 활동이 없습니다.</li>';
    } else {
        activityList.innerHTML = recentDiaries.map(diary => {
            let cropName = '전체';
            if (diary.crop) {
                // crops에서 id 또는 name 매칭
                let found = crops.find(c => String(c.id) === String(diary.crop) || c.name === diary.crop);
                if (found) cropName = found.name;
                else cropName = diary.crop;
            }
            return `<li>${diary.date}: ${diary.workType} - ${cropName}</li>`;
        }).join('');
    }
}

// 할 일 아이템 생성
function createTaskItem(task) {
    let isCompleted = task.completed;
    let isAuto = task.isAuto;
    let todayKey = getTodayKey();
    // 자동 할일 체크/삭제 상태 반영
    if (isAuto) {
        isCompleted = autoTaskCompleted.find(t => t.taskId === task.id)?.completed || false;
        if (autoTaskDeleted[todayKey]?.includes(task.id)) {
            return '';
        }
    }
    // 삭제 버튼: 일반 할일이거나(항상), 자동 할일이면서 체크된 경우만
    const showDeleteBtn = !isAuto || (isAuto && isCompleted);
    const deleteBtn = showDeleteBtn ? `<button class="task-delete-btn" onclick="deleteTask('${task.id}', ${isAuto})"><i class="fas fa-times"></i></button>` : '';
    return `
        <li>
            <div class="task-item-content">
                <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleTask('${task.id}', ${isAuto})">
                <span class="task-item-text ${isCompleted ? 'completed' : ''}">${escapeHTML(task.text)}</span>
            </div>
            ${deleteBtn}
        </li>
    `;
}

// 새 할 일 추가
function addNewTask() {
    const input = document.getElementById('newTaskInput');
    const taskText = input.value.trim();
    
    if (!taskText) {
        showMessage('할 일을 입력해주세요.', 'error');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const newTask = {
        id: Date.now().toString(),
        text: taskText,
        date: today,
        completed: false,
        isAuto: false
    };
    
    addTask(newTask);
    
    input.value = '';
    updateTodayTasks();
    showMessage('할 일이 추가되었습니다!', 'success');
}

// 할 일 완료 상태 토글
function toggleTask(taskId, isAuto = false) {
    if (isAuto) {
        const todayKey = getTodayKey();
        const completed = autoTaskCompleted.find(t => t.taskId === taskId);
        if (!completed) {
            addAutoTaskCompleted(taskId);
        } else {
            removeAutoTaskCompleted(taskId);
        }
        return;
    }
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        updateTask(task);
    }
}

// 할 일 삭제
function deleteTask(taskId, isAuto = false) {
    if (isAuto) {
        const todayKey = getTodayKey();
        const deleted = autoTaskDeleted.find(t => t.taskId === taskId);
        if (!deleted) {
            addAutoTaskDeleted(taskId);
        }
        return;
    }
    deleteTaskById(taskId);
    showMessage('할 일이 삭제되었습니다.', 'success');
}

// Enter 키로 할 일 추가
document.addEventListener('DOMContentLoaded', function() {
    const newTaskInput = document.getElementById('newTaskInput');
    if (newTaskInput) {
        newTaskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNewTask();
            }
        });
    }
});

// 작물 목록 로드
function loadCrops() {
    const cropsGrid = document.getElementById('cropsGrid');
    
    if (crops.length === 0) {
        cropsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-seedling"></i>
                <h3>등록된 작물이 없습니다</h3>
                <p>새 작물을 추가하여 농장 관리를 시작하세요!</p>
                <button class="btn btn-primary" onclick="showAddCropModal()">첫 작물 추가하기</button>
            </div>
        `;
        return;
    }
    
    cropsGrid.innerHTML = crops.map(crop => createCropCard(crop)).join('');
}

// 작물 카드 생성
function createCropCard(crop) {
    const plantDate = new Date(crop.plantDate);
    const today = new Date();
    const daysSincePlant = Math.floor((today - plantDate) / (1000 * 60 * 60 * 24));
    
    let status = 'growing';
    let statusText = '재배중';
    let progress = 0;
    
    if (crop.expectedHarvest) {
        const harvestDate = new Date(crop.expectedHarvest);
        const totalDays = Math.floor((harvestDate - plantDate) / (1000 * 60 * 60 * 24));
        progress = Math.min((daysSincePlant / totalDays) * 100, 100);
        
        if (progress >= 100) {
            status = 'ready';
            statusText = '수확가능';
        }
    }
    
    return `
        <div class="card crop-card">
            <div class="crop-header">
                <div class="crop-name">${escapeHTML(crop.name)}</div>
                <div class="crop-status status-${status}">${statusText}</div>
            </div>
            <div class="crop-info">
                <p><strong>파종일:</strong> ${formatDate(crop.plantDate)}</p>
                ${crop.expectedHarvest ? `<p><strong>수확 예정:</strong> ${formatDate(crop.expectedHarvest)}</p>` : ''}
                <p><strong>재배 기간:</strong> ${daysSincePlant}일</p>
                ${crop.notes ? `<p><strong>메모:</strong> ${escapeHTML(crop.notes)}</p>` : ''}
            </div>
            ${crop.expectedHarvest ? `
                <div class="crop-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${Math.round(progress)}% 완료</small>
                </div>
            ` : ''}
            <div style="margin-top: 1rem; text-align:right;">
                <button class="btn btn-secondary btn-small" onclick="handleEditCropClick('${crop.id}')" style="margin-right:0.5rem;">수정</button>
                <button class="btn btn-secondary btn-small" onclick="deleteCrop('${crop.id}')">삭제</button>
            </div>
        </div>
    `;
}

// 작물 수정 버튼 클릭 핸들러
function handleEditCropClick(cropId) {
    const cropToEdit = crops.find(c => String(c.id) === String(cropId));
    if (cropToEdit) {
        showAddCropModal(cropToEdit);
    } else {
        showMessage('수정할 작물을 찾을 수 없습니다.', 'error');
    }
}

// 일지 작성 처리
function handleDiarySubmit(e) {
    e.preventDefault();
    
    const date = document.getElementById('diaryDate').value;
    const weather = document.getElementById('weather').value;
    const temperature = document.getElementById('temperature').value;
    const workType = document.getElementById('workType').value;
    const crop = document.getElementById('cropSelect').value;
    const harvestAmount = document.getElementById('harvestAmount').value;
    const workDescription = document.getElementById('workDescription').value.trim();
    const newDiary = {
        id: Date.now().toString(),
        date: date,
        weather: weather,
        temperature: temperature,
        workType: workType,
        crop: crop,
        harvestAmount: harvestAmount,
        workDescription: workDescription
    };
    if (!validateDiaryData(newDiary)) return;
    
    addDiary(newDiary);
    
    // 폼 초기화
    e.target.reset();
    setTodayDate();
    
    // 성공 메시지
    showMessage('일지가 성공적으로 저장되었습니다!', 'success');
    
    // 일지 목록 새로고침
    loadDiaryHistory();
    
    // 대시보드 업데이트
    if (currentSection === 'dashboard') {
        loadDashboard();
    }
}

// 일지 히스토리 로드
function loadDiaryHistory() {
    const diaryHistory = document.getElementById('diaryHistory');
    
    if (diaries.length === 0) {
        diaryHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book"></i>
                <h3>작성된 일지가 없습니다</h3>
                <p>첫 번째 농사 일지를 작성해보세요!</p>
            </div>
        `;
        return;
    }
    
    const sortedDiaries = diaries.slice().reverse();
    diaryHistory.innerHTML = sortedDiaries.map(diary => createDiaryItem(diary)).join('');
}

// 일지 아이템 생성
function createDiaryItem(diary) {
    const cropName = diary.crop ? crops.find(c => String(c.id) === String(diary.crop))?.name || '알 수 없음' : '전체';
    
    return `
        <div class="diary-item">
            <div class="diary-date">${formatDate(diary.date)} - ${diary.weather} ${diary.temperature ? diary.temperature + '°C' : ''}</div>
            <div class="diary-summary">${diary.workType} - ${cropName}</div>
            <div class="diary-details">${escapeHTML(diary.workDescription)}</div>
            ${diary.harvestAmount ? `<div class="diary-details"><strong>수확량:</strong> ${diary.harvestAmount}kg</div>` : ''}
            <div class="diary-actions" style="margin-top:0.8rem; text-align:right;">
                <button class="btn btn-secondary btn-small" onclick="handleEditDiaryClick('${diary.id}')" style="margin-right:0.5rem;">수정</button>
                <button class="btn btn-secondary btn-small" onclick="deleteDiary('${diary.id}')">삭제</button>
            </div>
        </div>
    `;
}

// 일지 수정 버튼 클릭 핸들러
function handleEditDiaryClick(diaryId) {
    console.log('handleEditDiaryClick 호출. diaryId:', diaryId);
    const diaryToEdit = diaries.find(d => String(d.id) === String(diaryId));
    if (diaryToEdit) {
        // 폼 필드에 데이터 채우기
        document.getElementById('diaryIdHidden').value = diaryToEdit.id;
        console.log('handleEditDiaryClick: diaryIdHidden 값 설정됨:', document.getElementById('diaryIdHidden').value);
        document.getElementById('diaryDate').value = diaryToEdit.date;
        document.getElementById('weather').value = diaryToEdit.weather;
        document.getElementById('temperature').value = diaryToEdit.temperature || '';
        document.getElementById('workType').value = diaryToEdit.workType;
        document.getElementById('cropSelect').value = diaryToEdit.crop || '';
        document.getElementById('harvestAmount').value = diaryToEdit.harvestAmount || '';
        document.getElementById('workDescription').value = diaryToEdit.workDescription || '';
        
        // 버튼 텍스트 변경
        document.getElementById('saveDiaryButton').textContent = '일지 수정';
        showMessage('일지 수정 모드입니다. 내용을 수정하세요.', 'info');
    } else {
        showMessage('수정할 일지를 찾을 수 없습니다.', 'error');
    }
}

// 일지 삭제
async function deleteDiary(diaryId) {
    if (confirm('정말로 이 일지를 삭제하시겠습니까?')) {
        console.log('삭제 시도: diaryId', diaryId);
        console.log('삭제 전 diaries 길이:', diaries.length);
        try {
            await db.diaries.delete(parseInt(diaryId));
            console.log('db.diaries.delete 호출 완료. 다시 로드하기 전 diaries 길이:', diaries.length);
            await loadAllData();
            console.log('loadAllData 호출 완료. 다시 로드 후 diaries 길이:', diaries.length);
            loadDiaryHistory();
            loadStatistics();
            showMessage('일지가 성공적으로 삭제되었습니다.', 'success');
            console.log('일지 삭제 성공. 최종 diaries 길이:', diaries.length);
        } catch (error) {
            console.error('일지 삭제 중 오류 발생:', error);
            showMessage('일지 삭제에 실패했습니다: ' + error.message, 'error');
        }
    }
}

// 일지 폼 초기화
function resetDiaryForm() {
    const diaryForm = document.getElementById('diaryForm');
    diaryForm.reset();
    document.getElementById('diaryIdHidden').value = '';
    document.getElementById('saveDiaryButton').textContent = '일지 저장';
    setTodayDate(); // 오늘 날짜로 초기화
}

// 일지 저장/수정 처리 (handleDiarySubmit 대체)
async function saveDiary(e) {
    e.preventDefault();
    console.log('saveDiary 호출. diaryIdHidden 현재 값:', document.getElementById('diaryIdHidden').value);
    const diaryId = document.getElementById('diaryIdHidden').value; // 수정 시 ID
    const date = document.getElementById('diaryDate').value;
    const weather = document.getElementById('weather').value;
    const temperature = document.getElementById('temperature').value;
    const workType = document.getElementById('workType').value;
    const crop = document.getElementById('cropSelect').value;
    const harvestAmount = document.getElementById('harvestAmount').value;
    const workDescription = document.getElementById('workDescription').value.trim();
    
    const diaryData = {
        date: date,
        weather: weather,
        temperature: temperature,
        workType: workType,
        crop: crop,
        harvestAmount: harvestAmount,
        workDescription: workDescription
    };

    if (!validateDiaryData(diaryData)) return;

    if (diaryId) {
        // 기존 일지 수정
        diaryData.id = parseInt(diaryId);
        await db.diaries.put(diaryData);
        showMessage('일지가 성공적으로 수정되었습니다!', 'success');
    } else {
        // 새 일지 저장
        await db.diaries.add(diaryData);
        showMessage('일지가 성공적으로 저장되었습니다!', 'success');
    }

    await loadAllData();
    resetDiaryForm(); // 폼 초기화
    loadDiaryHistory();
    loadStatistics(); // 통계 업데이트

    // 대시보드 업데이트
    if (currentSection === 'dashboard') {
        loadDashboard();
    }
}

// 작물 추가 모달 표시 (수정 시 데이터 채움)
function showAddCropModal(crop = null) {
    const modal = document.getElementById('addCropModal');
    const form = document.getElementById('addCropForm');
    const modalTitle = modal.querySelector('.modal-header h2');
    const cropIdInput = document.getElementById('cropIdHidden');
    const saveButton = document.getElementById('saveCropButton');

    if (crop) {
        modalTitle.textContent = '작물 수정';
        document.getElementById('cropName').value = crop.name;
        document.getElementById('plantDate').value = crop.plantDate;
        document.getElementById('expectedHarvest').value = crop.expectedHarvest || '';
        document.getElementById('cropNotes').value = crop.notes || '';
        cropIdInput.value = crop.id;
        saveButton.textContent = '수정'; // 수정 모드일 때 버튼 텍스트 변경
    } else {
        modalTitle.textContent = '새 작물 추가';
        form.reset();
        cropIdInput.value = '';
        saveButton.textContent = '추가'; // 추가 모드일 때 버튼 텍스트 변경
    }
    modal.style.display = 'block';
}

// 작물 추가 모달 닫기
function closeAddCropModal() {
    document.getElementById('addCropModal').style.display = 'none';
    document.getElementById('addCropForm').reset(); // 폼 초기화
    document.getElementById('cropIdHidden').value = ''; // ID 초기화
    // 닫을 때 버튼 텍스트를 '추가'로 다시 설정 (선택 사항, 다음 열 때 다시 설정되므로 필수 아님)
    // document.getElementById('saveCropButton').textContent = '추가'; 
}

// 작물 추가/수정 처리
async function saveCrop(e) {
    e.preventDefault();
    const cropId = document.getElementById('cropIdHidden').value; // 수정 시 ID 가져옴
    const name = document.getElementById('cropName').value.trim();
    const plantDate = document.getElementById('plantDate').value;
    const expectedHarvest = document.getElementById('expectedHarvest').value;
    const notes = document.getElementById('cropNotes').value.trim();

    if (!name || name === '') {
        showMessage('작물명은 필수입니다.', 'error');
        return;
    }
    if (!plantDate) {
        showMessage('파종일은 필수입니다.', 'error');
        return;
    }

    const cropData = {
        name: name,
        plantDate: plantDate,
        expectedHarvest: expectedHarvest,
        notes: notes
    };

    if (cropId) {
        // 기존 작물 수정
        cropData.id = parseInt(cropId); // Dexie는 숫자 ID를 기대함
        await db.crops.put(cropData);
        showMessage('작물이 성공적으로 수정되었습니다.', 'success');
    } else {
        // 새 작물 추가
        await db.crops.add(cropData);
        showMessage('새 작물이 성공적으로 추가되었습니다.', 'success');
    }

    await loadAllData();
    loadCrops();
    updateCropSelect();
    closeAddCropModal();
}

// 작물 삭제
function deleteCrop(cropId) {
    if (confirm('정말로 이 작물을 삭제하시겠습니까?')) {
        db.crops.delete(cropId);
        loadAllData();
        
        showMessage('작물이 삭제되었습니다.', 'success');
        loadCrops();
        updateCropSelect();
        
        if (currentSection === 'dashboard') {
            loadDashboard();
        }
    }
}

// 작물 선택 옵션 업데이트
function updateCropSelect() {
    const cropSelect = document.getElementById('cropSelect');
    if (!cropSelect) return;
    
    cropSelect.innerHTML = '<option value="">선택하세요</option>' +
        crops.map(crop => `<option value="${crop.id}">${escapeHTML(crop.name)}</option>`).join('');
}

// 통계 로드
function loadStatistics() {
    updateStatsSummary();
    createHarvestChart();
    createCropChart();
}

// 통계 요약 업데이트
function updateStatsSummary() {
    const totalHarvest = diaries
        .filter(diary => diary.harvestAmount)
        .reduce((sum, diary) => sum + parseFloat(diary.harvestAmount), 0);
    
    document.getElementById('totalHarvest').textContent = `${totalHarvest.toFixed(1)} kg`;
    document.getElementById('totalCrops').textContent = `${crops.length} 개`;
    document.getElementById('totalDiaries').textContent = `${diaries.length} 개`;
}

// 수확량 차트 생성
function createHarvestChart() {
    const ctx = document.getElementById('harvestChart');
    if (!ctx) return;
    
    // 기존 차트 인스턴스가 있다면 파괴
    if (harvestChartInstance) {
        harvestChartInstance.destroy();
    }

    // 월별 수확량 데이터 준비
    const monthlyHarvest = {};
    diaries.forEach(diary => {
        if (diary.harvestAmount) {
            const month = diary.date.substring(0, 7); // YYYY-MM
            monthlyHarvest[month] = (monthlyHarvest[month] || 0) + parseFloat(diary.harvestAmount);
        }
    });
    
    const labels = Object.keys(monthlyHarvest).sort();
    const data = labels.map(month => monthlyHarvest[month]);
    
    harvestChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(month => {
                const [year, monthNum] = month.split('-');
                return `${year}년 ${monthNum}월`;
            }),
            datasets: [{
                label: '수확량 (kg)',
                data: data,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 작물별 차트 생성
function createCropChart() {
    const ctx = document.getElementById('cropChart');
    if (!ctx) return;

    // 기존 차트 인스턴스가 있다면 파괴
    if (cropChartInstance) {
        cropChartInstance.destroy();
    }
    
    // 작물별 수확량 데이터 준비
    const cropHarvest = {};
    diaries.forEach(diary => {
        if (diary.harvestAmount && diary.crop) {
            const crop = crops.find(c => c.id === diary.crop);
            if (crop) {
                cropHarvest[crop.name] = (cropHarvest[crop.name] || 0) + parseFloat(diary.harvestAmount);
            }
        }
    });
    
    const labels = Object.keys(cropHarvest);
    const data = Object.values(cropHarvest);
    
    if (labels.length === 0) {
        ctx.getContext('2d').fillText('수확 데이터가 없습니다', 50, 50);
        return;
    }
    
    cropChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#4CAF50',
                    '#2196F3',
                    '#FF9800',
                    '#E91E63',
                    '#9C27B0',
                    '#00BCD4'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// 유틸리티 함수들
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function showMessage(message, type = 'success') {
    // 기존 메시지 제거
    const oldMsg = document.querySelector('.message');
    if (oldMsg) oldMsg.remove();
    const msg = document.createElement('div');
    msg.className = `message ${type}`;
    msg.textContent = message;
    // 현재 활성 섹션의 마지막에 추가
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
        activeSection.appendChild(msg);
    } else {
        document.body.appendChild(msg);
    }
    setTimeout(() => {
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 400);
    }, 2000);
}

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const modal = document.getElementById('addCropModal');
    if (event.target === modal) {
        closeAddCropModal();
    }
}

// 데이터 내보내기 (기존 함수 활용)
async function exportData() {
    await loadAllData();
    const data = {
        crops: crops,
        diaries: diaries,
        tasks: tasks,
        autoTaskCompleted: autoTaskCompleted,
        autoTaskDeleted: autoTaskDeleted,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `농사일지_백업_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showMessage('데이터가 내보내기 되었습니다.', 'success');
}

// 데이터 복원(Import)
async function importDataFromFile(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);

        // 필수 필드 검증
        if (
            !data ||
            !Array.isArray(data.crops) ||
            !Array.isArray(data.diaries) ||
            !Array.isArray(data.tasks) ||
            !Array.isArray(data.autoTaskCompleted) ||
            !Array.isArray(data.autoTaskDeleted)
        ) {
            throw new Error('백업 파일 구조가 올바르지 않습니다.');
        }

        // 기존 데이터 모두 삭제
        await db.crops.clear();
        await db.diaries.clear();
        await db.tasks.clear();
        await db.autoTaskCompleted.clear();
        await db.autoTaskDeleted.clear();

        // 데이터 복원
        await db.crops.bulkAdd(data.crops);
        await db.diaries.bulkAdd(data.diaries);
        await db.tasks.bulkAdd(data.tasks);
        await db.autoTaskCompleted.bulkAdd(data.autoTaskCompleted);
        await db.autoTaskDeleted.bulkAdd(data.autoTaskDeleted);

        await loadAllData();
        try {
            loadDashboard();
            loadCrops();
            loadDiaryHistory();
            loadStatistics();
        } catch (e) {
            console.error('복원 후 화면 갱신 오류:', e);
        }
        showMessage('데이터가 성공적으로 복원되었습니다.', 'success');
    } catch (e) {
        console.error('복원 실패:', e);
        showMessage('복원 실패: 내보내기(백업) 파일만 복원할 수 있습니다.', 'error');
    }
}

// 데이터 관리 메뉴 버튼 이벤트 연결
window.addEventListener('DOMContentLoaded', function() {
    // 내보내기 버튼
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.onclick = exportData;
    }
    // 복원(Import) 파일 업로드
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.onchange = function(e) {
            if (e.target.files && e.target.files[0]) {
                importDataFromFile(e.target.files[0]);
                e.target.value = '';
            }
        };
    }
    // 데이터 초기화 버튼들
    const resetAllBtn = document.getElementById('resetAllBtn');
    if (resetAllBtn) {
        resetAllBtn.onclick = async function() {
            if (confirm('정말로 전체 데이터를 초기화하시겠습니까?')) {
                await db.crops.clear();
                await db.diaries.clear();
                await db.tasks.clear();
                await db.autoTaskCompleted.clear();
                await db.autoTaskDeleted.clear();
                await loadAllData();
                loadDashboard();
                loadCrops();
                loadDiaryHistory();
                loadStatistics();
                showMessage('전체 데이터가 초기화되었습니다.', 'success');
            }
        };
    }
    const resetCropsBtn = document.getElementById('resetCropsBtn');
    if (resetCropsBtn) {
        resetCropsBtn.onclick = async function() {
            if (confirm('정말로 작물 데이터를 초기화하시겠습니까?')) {
                await db.crops.clear();
                await loadAllData();
                loadDashboard();
                loadCrops();
                updateCropSelect();
                showMessage('작물 데이터가 초기화되었습니다.', 'success');
            }
        };
    }
    const resetDiariesBtn = document.getElementById('resetDiariesBtn');
    if (resetDiariesBtn) {
        resetDiariesBtn.onclick = async function() {
            if (confirm('정말로 일지 데이터를 초기화하시겠습니까?')) {
                await db.diaries.clear();
                await loadAllData();
                loadDashboard();
                loadDiaryHistory();
                loadStatistics();
                showMessage('일지 데이터가 초기화되었습니다.', 'success');
            }
        };
    }
    const resetTasksBtn = document.getElementById('resetTasksBtn');
    if (resetTasksBtn) {
        resetTasksBtn.onclick = async function() {
            if (confirm('정말로 할일 데이터를 초기화하시겠습니까?')) {
                await db.tasks.clear();
                await db.autoTaskCompleted.clear();
                await db.autoTaskDeleted.clear();
                await loadAllData();
                loadDashboard();
                updateTodayTasks();
                showMessage('할일 데이터가 초기화되었습니다.', 'success');
            }
        };
    }
});

// 3. 수확 예정일 알림 기능
function checkHarvestReminders() {
    const today = new Date();
    crops.forEach(crop => {
        if (crop.expectedHarvest) {
            const harvestDate = new Date(crop.expectedHarvest);
            const daysUntilHarvest = Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24));
            if (daysUntilHarvest <= 3 && daysUntilHarvest >= 0) {
                showMessage(`${escapeHTML(crop.name)} 수확이 ${daysUntilHarvest}일 남았습니다!`, 'info');
            }
        }
    });
}

// 4. 데이터 검증 및 에러 처리 강화
function validateCropData(crop) {
    if (!crop.name || crop.name.trim() === '') {
        showMessage('작물명은 필수입니다.', 'error');
        return false;
    }
    if (!crop.plantDate) {
        showMessage('파종일은 필수입니다.', 'error');
        return false;
    }
    return true;
}

function validateDiaryData(diary) {
    if (!diary.date) {
        showMessage('날짜는 필수입니다.', 'error');
        return false;
    }
    if (!diary.workType) {
        showMessage('작업 종류는 필수입니다.', 'error');
        return false;
    }
    return true;
}

// 5. XSS 등 보안 관련 입력값 검증 (간단한 escape 함수)
function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function(tag) {
        const charsToReplace = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return charsToReplace[tag] || tag;
    });
}

// 연도 선택 콤보박스 초기화 및 이벤트
function setupCropYearSelect() {
    const select = document.getElementById('cropYearSelect');
    if (!select) return;
    const thisYear = new Date().getFullYear();
    select.innerHTML = '';
    for (let y = thisYear; y >= thisYear - 4; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + '년';
        if (y === thisYear) opt.selected = true;
        select.appendChild(opt);
    }
    select.onchange = updateCropsSummary;
}

// 연도별 작물 현황 집계
function updateCropsSummary() {
    const totalCropsElement = document.querySelector('.crops-summary .stat .number');
    const upcomingHarvestElement = document.querySelectorAll('.crops-summary .stat .number')[1];
    const year = document.getElementById('cropYearSelect')?.value;
    let filteredCrops = crops;
    if (year) {
        filteredCrops = crops.filter(crop => {
            if (!crop.plantDate) return false;
            const cropYear = new Date(crop.plantDate).getFullYear();
            return String(cropYear) === String(year);
        });
    }
    if (totalCropsElement) {
        totalCropsElement.textContent = filteredCrops.length;
    }
    // 수확 예정 작물 계산
    const upcomingHarvests = filteredCrops.filter(crop => {
        if (!crop.expectedHarvest) return false;
        const harvestDate = new Date(crop.expectedHarvest);
        const today = new Date();
        const daysUntilHarvest = Math.floor((harvestDate - today) / (1000 * 60 * 60 * 24));
        return daysUntilHarvest >= 0 && daysUntilHarvest <= 30;
    }).length;
    if (upcomingHarvestElement) {
        upcomingHarvestElement.textContent = upcomingHarvests;
    }
}

// 대시보드 로드시 연도 콤보박스 세팅
function loadDashboard() {
    fetchWeather();
    updateTodayTasks();
    setupCropYearSelect();
    updateCropsSummary();
    updateRecentActivity();
    checkHarvestReminders();
}

// 작물 관리 연도 콤보박스 초기화 및 이벤트
function setupCropsManageYearSelect() {
    const select = document.getElementById('cropsManageYearSelect');
    if (!select) return;
    const thisYear = new Date().getFullYear();
    select.innerHTML = '';
    for (let y = thisYear; y >= thisYear - 4; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y + '년';
        if (y === thisYear) opt.selected = true;
        select.appendChild(opt);
    }
    select.onchange = loadCrops;
}

// 연도별 작물 목록 표시
function loadCrops() {
    const cropsGrid = document.getElementById('cropsGrid');
    if (!cropsGrid) return;
    const year = document.getElementById('cropsManageYearSelect')?.value;
    let filteredCrops = crops;
    if (year) {
        filteredCrops = crops.filter(crop => {
            if (!crop.plantDate) return false;
            const cropYear = new Date(crop.plantDate).getFullYear();
            return String(cropYear) === String(year);
        });
    }
    if (filteredCrops.length === 0) {
        cropsGrid.innerHTML = '<div class="empty-state"><i class="fas fa-leaf"></i><h3>등록된 작물이 없습니다</h3><p>해당 연도에 등록된 작물이 없습니다.</p></div>';
    } else {
        cropsGrid.innerHTML = filteredCrops.map(crop => createCropCard(crop)).join('');
    }
}

// 작물 관리 진입 시 연도 콤보박스 세팅
function showSection(sectionName) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    // 선택된 섹션 표시
    document.getElementById(sectionName).classList.add('active');
    currentSection = sectionName;
    // 섹션별 데이터 새로고침
    if (sectionName === 'dashboard') {
        loadDashboard();
    } else if (sectionName === 'crops') {
        setupCropsManageYearSelect();
        loadCrops();
    } else if (sectionName === 'diary') {
        loadDiaryHistory();
    } else if (sectionName === 'statistics') {
        loadStatistics();
    }
}