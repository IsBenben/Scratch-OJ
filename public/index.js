document.getElementById('runBtn').addEventListener('click', async () => {
  const casesText = document.getElementById('casesInput').value;
  const fileInput = document.getElementById('projectFile');
  let cases;
  try {
    cases = JSON.parse(casesText);
  } catch (e) {
    alert('JSON 格式错误，请检查');
    return;
  }
  if (fileInput.files.length == 0) {
    alert('未选择 sb3 文件，请检查');
    return;
  }

  const formData = new FormData();
  formData.append('cases', JSON.stringify(cases));
  formData.append('project', fileInput.files[0]);

  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '<tr><td colspan="3">运行中...</td></tr>';
  document.getElementById('summary').textContent = '';

  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (data.error) {
      alert('服务器错误: ' + data.error);
      return;
    }

    tbody.innerHTML = '';
    data.result.forEach((r) => {
      const tr = document.createElement('tr');
      let statusClass = '';
      if (r.message === 'Accepted') statusClass = 'accepted';
      else if (r.message === 'Wrong Answer') statusClass = 'wrong';
      else if (r.message === 'Time Limit Exceeded') statusClass = 'tle';
      tr.innerHTML = `
              <td>${r.case}</td>
              <td class="${statusClass}">${r.message}</td>
              <td>${r.time}</td>
            `;
      tbody.appendChild(tr);
    });
    const totalTime = data.result.reduce((value, { time }) => value + time, 0);
    document.getElementById('summary').textContent =
      `总用时：${totalTime} ms，共 ${data.result.length} 个用例`;
  } catch (err) {
    alert('请求失败：' + err.message);
    throw err;
  }
});
