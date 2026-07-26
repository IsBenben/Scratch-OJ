const VirtualMachine = require('scratch-vm');

function test(buffer, input, output) {
  return new Promise(async (resolve) => {
    const timeout = setTimeout(() => {
      clearInterval(interval);
      vm.stopAll();
      resolve('Time Limit Exceeded');
    }, 1000);

    const vm = new VirtualMachine();

    vm.setCompatibilityMode(true);
    vm.setTurboMode(true);
    vm.clear();
    await vm.loadProject(buffer);

    vm.start();
    for (const [name, value] of Object.entries(input)) {
      vm.editingTarget.lookupVariableByNameAndType(name).value = value;
    }
    vm.greenFlag();

    const interval = setInterval(() => {
      let active = 0;
      const threads = vm.runtime.threads;
      for (let i = 0; i < threads.length; i++) {
        if (!threads[i].updateMonitor) {
          active += 1;
        }
      }
      if (active === 0) {
        clearInterval(interval);
        clearTimeout(timeout);
        vm.stopAll();
        let passed = true;
        for (const [name, value] of Object.entries(output)) {
          const result =
            vm.editingTarget.lookupVariableByNameAndType(name).value;
          if (result.toString() != value.toString()) {
            passed = false;
            resolve('Wrong Answer');
          }
        }
        if (passed) {
          resolve('Accepted');
        }
      }
    }, 16);
  });
}

async function runWithConcurrency(buffer, cases, limit) {
  const result = [];
  let i = 0;
  const executing = [];
  for (const { input, output } of cases) {
    const start = Date.now();
    const caseId = ++i;
    const p = test(buffer, input, output)
      .then((message) => {
        const time = Date.now() - start;
        result.push({
          case: caseId,
          time,
          message: time > 1000 ? 'Time Limit Exceeded' : message,
        });
      })
      .finally(() => {
        const idx = executing.indexOf(p);
        if (idx !== -1) executing.splice(idx, 1);
      });
    executing.push(p);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return result;
}

module.exports = { runWithConcurrency };
