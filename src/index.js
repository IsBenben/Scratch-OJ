const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { runWithConcurrency } = require('./utils');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.json({ limit: '1mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 },
});

const problems = [
  {
    id: 1,
    title: 'A+B Problem',
    description:
      '输入两个整数 a 和 b（0≤a,b≤10^9），计算它们的和，并将结果保存在变量 c 中。',
    samples: [
      { input: { a: 1, b: 2 }, output: { c: 3 } },
      { input: { a: 373213099, b: 645933766 }, output: { c: 1019146865 } },
    ],
    cases: [
      { input: { a: 1, b: 2 }, output: { c: 3 } },
      { input: { a: 373213099, b: 645933766 }, output: { c: 1019146865 } },
      { input: { a: 737056777, b: 450841551 }, output: { c: 1187898328 } },
      { input: { a: 91716413, b: 726970839 }, output: { c: 818687252 } },
      { input: { a: 669228367, b: 299419844 }, output: { c: 968648211 } },
      { input: { a: 80086555, b: 347787116 }, output: { c: 427873671 } },
      { input: { a: 304902451, b: 176872735 }, output: { c: 481775186 } },
      { input: { a: 725942019, b: 458054350 }, output: { c: 1183996369 } },
      { input: { a: 627755905, b: 303055225 }, output: { c: 930811130 } },
      { input: { a: 347571140, b: 491179219 }, output: { c: 838750359 } },
      { input: { a: 117476496, b: 456926696 }, output: { c: 574403192 } },
      { input: { a: 76717022, b: 556526260 }, output: { c: 633243282 } },
      { input: { a: 557550472, b: 633695723 }, output: { c: 1191246195 } },
      { input: { a: 233730020, b: 622624690 }, output: { c: 856354710 } },
      { input: { a: 882702204, b: 544048440 }, output: { c: 1426750644 } },
      { input: { a: 932882595, b: 168403143 }, output: { c: 1101285738 } },
      { input: { a: 861068411, b: 486312936 }, output: { c: 1347381347 } },
      { input: { a: 265340222, b: 0 }, output: { c: 265340222 } },
      { input: { a: 0, b: 578891074 }, output: { c: 578891074 } },
      { input: { a: 0, b: 0 }, output: { c: 0 } },
    ],
  },
  {
    id: 2,
    title: 'Hello world',
    description:
      '请将变量 output 的内容设为"Hello world"，不包含引号。',
    samples: [
      { input: { }, output: { output: 'Hello world' } },
    ],
    cases: [
      { input: { }, output: { output: 'Hello world' } },
    ],
  },
];

app.get('/api/problems', (req, res) => {
  const list = problems.map(({ id, title }) => ({ id, title }));
  res.json(list);
});

app.get('/api/problems/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const problem = problems.find((p) => p.id === id);
  if (!problem) {
    return res.status(404).json({ error: 'Problem not found' });
  }
  const { cases, ...publicInfo } = problem;
  res.json(publicInfo);
});

let submissions = [];
let submissionIdCounter = 1;

app.post(
  '/api/problems/:id/submissions',
  upload.single('project'),
  async (req, res) => {
    const id = parseInt(req.params.id);
    const problem = problems.find((p) => p.id === id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No project file uploaded' });
    }

    try {
      const result = await runWithConcurrency(
        req.file.buffer,
        problem.cases,
        1,
      );
      const submission = {
        id: submissionIdCounter++,
        problemId: id,
        problemTitle: problem.title,
        result: result,
        status: result.every((r) => r.message === 'Accepted')
          ? 'Accepted'
          : result.some((r) => r.message === 'Time Limit Exceeded')
            ? 'Time Limit Exceeded'
            : 'Wrong Answer',
        createdAt: new Date(),
      };
      submissions.push(submission);
      res.json({ submissionId: submission.id, result });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

app.get('/api/submissions', (req, res) => {
  const problemId = req.query.problem ? parseInt(req.query.problem) : undefined;
  let list = submissions;
  if (problemId) {
    list = list.filter((s) => s.problemId === problemId);
  }
  const result = list.map(
    ({ id, problemId, problemTitle, status, createdAt }) => ({
      id,
      problemId,
      problemTitle,
      status,
      createdAt: createdAt.toISOString(),
    }),
  );
  res.json(result);
});

app.get('/api/submissions/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const submission = submissions.find((s) => s.id === id);
  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }
  res.json({ ...submission, createdAt: submission.createdAt.toISOString() });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
