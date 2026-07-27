const views = {
  home: document.getElementById('home'),
  list: document.getElementById('problemList'),
  detail: document.getElementById('problemDetail'),
  sublist: document.getElementById('submissionList'),
  subdetail: document.getElementById('submissionDetail'),
};

function showView(name) {
  Object.keys(views).forEach((key) => {
    views[key].style.display = key === name ? 'block' : 'none';
  });
}

function navigate() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] === 'problems') {
    if (parts.length === 2) {
      showProblemDetail(parts[1]);
    } else {
      showProblemList();
    }
  } else if (parts[0] === 'submissions') {
    if (parts.length === 2) {
      showSubmissionDetail(parts[1]);
    } else {
      showSubmissionList();
    }
  } else {
    showView('home');
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('load', navigate);

// ---------- 题目列表 ----------
async function showProblemList() {
  showView('list');
  const tbody = document.getElementById('problemTbody');
  tbody.innerHTML = '<tr><td colspan="3">加载中…</td></tr>';
  try {
    const res = await fetch('/api/problems');
    const data = await res.json();
    if (res.ok) {
      tbody.innerHTML = data
        .map(
          (p) => `
            <tr>
              <td>${p.id}</td>
              <td>${p.title}</td>
              <td><a href="#/problems/${p.id}">查看详情</a></td>
            </tr>
          `,
        )
        .join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="3">加载失败：${data.error}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="3">网络错误：${err.message}</td></tr>`;
  }
}

// ---------- 题目详情 ----------
async function showProblemDetail(id) {
  showView('detail');
  const titleEl = document.getElementById('detailTitle');
  const descEl = document.getElementById('detailDescription');
  const sampleEl = document.getElementById('detailSample');
  const resultTbody = document.getElementById('resultTbody');
  const summaryEl = document.getElementById('summary');
  const submissionLink = document.getElementById('submissionLink');
  resultTbody.innerHTML = '';
  summaryEl.textContent = '';
  submissionLink.innerHTML = '';

  titleEl.textContent = '加载中…';
  descEl.textContent = '';
  sampleEl.textContent = '';

  try {
    const res = await fetch(`/api/problems/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '获取失败');

    titleEl.textContent = `${data.id}. ${data.title}`;
    descEl.textContent = data.description || '（无描述）';
    sampleEl.innerHTML = renderSamples(data.samples);

    // 绑定提交表单
    const form = document.getElementById('submitForm');
    form.onsubmit = (e) => {
      e.preventDefault();
      submitSolution(id);
    };
  } catch (err) {
    titleEl.textContent = '加载失败';
    descEl.textContent = err.message;
  }
}

// ---------- 提交评测 ----------
async function submitSolution(problemId) {
  const fileInput = document.getElementById('projectFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('请先选择 .sb3 文件');
    return;
  }

  const resultTbody = document.getElementById('resultTbody');
  const summaryEl = document.getElementById('summary');
  const submissionLink = document.getElementById('submissionLink');
  resultTbody.innerHTML = '<tr><td colspan="3">评测中…</td></tr>';
  summaryEl.textContent = '';
  submissionLink.innerHTML = '';

  const formData = new FormData();
  formData.append('project', file);

  try {
    const res = await fetch(`/api/problems/${problemId}/submissions`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '提交失败');

    const results = data.result;
    if (!results || results.length === 0) {
      resultTbody.innerHTML = '<tr><td colspan="3">无评测结果</td></tr>';
      return;
    }

    resultTbody.innerHTML = results
      .map((r) => {
        let statusClass = '';
        let label = r.message;
        if (label === 'Accepted') statusClass = 'accepted';
        else if (label === 'Wrong Answer') statusClass = 'wrong';
        else if (label === 'Time Limit Exceeded') statusClass = 'tle';
        return `<tr>
            <td>${r.case}</td>
            <td class="${statusClass}">${label}</td>
            <td>${r.time}</td>
          </tr>`;
      })
      .join('');

    const total = results.reduce((s, r) => s + r.time, 0);
    summaryEl.textContent = `总用时：${total} ms，共 ${results.length} 个用例`;
    if (data.submissionId) {
      submissionLink.innerHTML = `<a href="#/submissions/${data.submissionId}">查看本次提交详情</a>`;
    }
  } catch (err) {
    resultTbody.innerHTML = `<tr><td colspan="3">错误：${err.message}</td></tr>`;
  }
}

// ---------- 提交列表 ----------
async function showSubmissionList() {
  showView('sublist');
  const tbody = document.getElementById('submissionTbody');
  const filterSelect = document.getElementById('filterProblem');
  // 填充过滤器选项（题目列表）
  try {
    const probRes = await fetch('/api/problems');
    const probs = await probRes.json();
    const currentVal = filterSelect.value;
    filterSelect.innerHTML =
      '<option value="">全部</option>' +
      probs.map((p) => `<option value="${p.id}">${p.title}</option>`).join('');
    // 保持当前选中值（如果存在）
    if (currentVal) filterSelect.value = currentVal;
  } catch (e) {}

  // 加载提交列表
  await refreshSubmissionList();

  // 绑定过滤事件
  filterSelect.onchange = refreshSubmissionList;
  document.getElementById('refreshSubmissions').onclick = refreshSubmissionList;
}

async function refreshSubmissionList() {
  const tbody = document.getElementById('submissionTbody');
  const filterVal = document.getElementById('filterProblem').value;
  let url = '/api/submissions';
  if (filterVal) url += `?problem=${filterVal}`;
  tbody.innerHTML = '<tr><td colspan="5">加载中…</td></tr>';
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">暂无提交记录</td></tr>';
      } else {
        tbody.innerHTML = data
          .map((s) => {
            const statusClass =
              s.status === 'Accepted'
                ? 'accepted'
                : s.status === 'Time Limit Exceeded'
                  ? 'tle'
                  : 'wrong';
            return `<tr>
                <td>${s.id}</td>
                <td>${s.problemTitle}</td>
                <td class="${statusClass}">${s.status}</td>
                <td>${new Date(s.createdAt).toLocaleString()}</td>
                <td><a href="#/submissions/${s.id}">查看详情</a></td>
              </tr>`;
          })
          .join('');
      }
    } else {
      tbody.innerHTML = `<tr><td colspan="5">加载失败：${data.error}</td></tr>`;
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">网络错误：${err.message}</td></tr>`;
  }
}

// ---------- 提交详情 ----------
async function showSubmissionDetail(id) {
  showView('subdetail');
  const idSpan = document.getElementById('submissionDetailId');
  const problemSpan = document.getElementById('submissionDetailProblem');
  const statusSpan = document.getElementById('submissionDetailStatus');
  const timeSpan = document.getElementById('submissionDetailTime');
  const tbody = document.getElementById('submissionDetailTbody');

  idSpan.textContent = id;
  problemSpan.textContent = '加载中…';
  statusSpan.textContent = '';
  timeSpan.textContent = '';
  tbody.innerHTML = '';

  try {
    const res = await fetch(`/api/submissions/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '获取失败');

    problemSpan.textContent = data.problemTitle;
    const statusClass =
      data.status === 'Accepted'
        ? 'accepted'
        : data.status === 'Time Limit Exceeded'
          ? 'tle'
          : 'wrong';
    statusSpan.innerHTML = `<span class="${statusClass}">${data.status}</span>`;
    timeSpan.textContent = new Date(data.createdAt).toLocaleString();

    if (data.result && data.result.length) {
      tbody.innerHTML = data.result
        .map((r) => {
          let cls = '';
          if (r.message === 'Accepted') cls = 'accepted';
          else if (r.message === 'Wrong Answer') cls = 'wrong';
          else if (r.message === 'Time Limit Exceeded') cls = 'tle';
          return `<tr><td>${r.case}</td><td class="${cls}">${r.message}</td><td>${r.time}</td></tr>`;
        })
        .join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="3">无详细结果</td></tr>';
    }
  } catch (err) {
    statusSpan.textContent = '加载失败：' + err.message;
  }
}
