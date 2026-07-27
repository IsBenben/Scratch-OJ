function renderSamples(samples) {
  const renderInput = (input) => {
    return Object.entries(input)
      .map(([key, value]) => `${key} = ${value}`)
      .join(', ');
  };
  return samples
    .map(
      (sample, index) =>
        `
          <h4>样例 #${index + 1}</h4>
          <div><strong>输入：</strong> ${renderInput(sample.input)}</div>
          <div><strong>输出：</strong> ${renderInput(sample.output)}</div>
        `,
    )
    .join('\n');
}
