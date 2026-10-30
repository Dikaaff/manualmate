import type { AnalysisResult } from '../types';

export function buildBrief(result: AnalysisResult): string {
  const lines: string[] = [
    'ManualMate inspection brief',
    `Created: ${new Date(result.createdAt).toLocaleString('en-US')}`,
    `Object: ${result.objectLabel}`,
    `Observation: ${result.observation}`,
  ];

  if (result.blocked) {
    lines.push(
      '',
      'STATUS: STOPPED',
      `Category: ${result.safety.category}`,
      `Reason: ${result.safety.reason}`,
      `Contact: ${result.safety.professional}`,
      '',
      'No repair steps are provided for this category.',
    );
  } else {
    lines.push(
      `Confidence: ${result.confidence}%`,
      `Difficulty: ${result.difficulty}`,
      `Estimated time: ${result.estimatedTime}`,
      `Tools: ${result.tools.length ? result.tools.join(', ') : 'None listed'}`,
      `Parts: ${result.parts.length ? result.parts.join(', ') : 'None listed'}`,
      '',
      'Repair checklist:',
    );
    result.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step.title}`, `   ${step.detail}`);
      if (step.safety) lines.push(`   Stop if: ${step.safety}`);
    });
    lines.push('', `Note: ${result.note}`);
  }

  lines.push(
    '',
    `Grounding: ${result.grounding.status} - ${result.grounding.note}`,
    `Model: ${result.model} (${result.provider})`,
    '',
    'This is a visual observation, not a diagnosis. Stop if anything feels unsafe.',
  );

  return lines.join('\n');
}
