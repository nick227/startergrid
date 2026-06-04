import type { VehicleIssue } from '../../lib/types.ts';

type Props = { issues: VehicleIssue[] };

export function VehicleRowExpand({ issues }: Props) {
  return (
    <>
      {issues.map((iss, i) => (
        <div key={i} className={`text-xs py-0.5 ${iss.severity === 'FAIL' ? 'text-red-600' : 'text-amber-600'}`}>
          {iss.severity === 'FAIL' ? '✕' : '⚠'} {iss.message}
        </div>
      ))}
    </>
  );
}
