import { describe, expect, it } from 'vitest';
import { parseContributionsHtml, parseContributionsJson } from '../src/lib/github';

/**
 * Fixture mirrors the real fragment served by github.com/users/{u}/contributions:
 * cells carry data-date + id="contribution-day-component-{weekday}-{week}",
 * tooltips carry the exact counts, and an <h2> carries the yearly total.
 */
const FRAGMENT = `
<div class="js-yearly-contributions">
  <h2 tabindex="-1" id="js-contribution-activity-description" class="f4 text-normal mb-2">
    1,234
    contributions
      in the last year
  </h2>
  <table role="grid" class="ContributionCalendar-grid">
    <tbody>
      <tr>
        <td tabindex="0" data-ix="0" style="width: 10px" data-date="2026-09-06" id="contribution-day-component-0-0" data-level="2" role="gridcell" data-view-component="true" class="ContributionCalendar-day"></td>
        <td tabindex="0" data-ix="0" style="width: 10px" data-date="2026-09-07" id="contribution-day-component-1-0" data-level="0" role="gridcell" data-view-component="true" class="ContributionCalendar-day"></td>
        <td tabindex="0" data-ix="0" style="width: 10px" data-date="2026-09-08" id="contribution-day-component-2-0" data-level="4" role="gridcell" data-view-component="true" class="ContributionCalendar-day"></td>
      </tr>
      <tr>
        <td tabindex="0" data-ix="1" style="width: 10px" data-date="2026-09-13" id="contribution-day-component-0-1" data-level="1" role="gridcell" data-view-component="true" class="ContributionCalendar-day"></td>
      </tr>
    </tbody>
  </table>
  <tool-tip style="pointer-events: none;" id="tooltip-a" for="contribution-day-component-0-0" popover="manual" data-direction="n" data-type="label" data-view-component="true" class="sr-only position-absolute">8 contributions on September 6th.</tool-tip>
  <tool-tip style="pointer-events: none;" id="tooltip-b" for="contribution-day-component-1-0" popover="manual" data-direction="n" data-type="label" data-view-component="true" class="sr-only position-absolute">No contributions on September 7th.</tool-tip>
  <tool-tip style="pointer-events: none;" id="tooltip-c" for="contribution-day-component-2-0" popover="manual" data-direction="n" data-type="label" data-view-component="true" class="sr-only position-absolute">21 contributions on September 8th.</tool-tip>
  <tool-tip style="pointer-events: none;" id="tooltip-d" for="contribution-day-component-0-1" popover="manual" data-direction="n" data-type="label" data-view-component="true" class="sr-only position-absolute">1 contribution on September 13th.</tool-tip>
</div>
`;

describe('parseContributionsHtml', () => {
  it('parses every cell with its date', () => {
    const parsed = parseContributionsHtml(FRAGMENT);
    expect(parsed).not.toBeNull();
    expect(parsed!.days.map((d) => d.date)).toEqual([
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
      '2026-09-13',
    ]);
  });

  it('prefers exact tooltip counts over levels', () => {
    const parsed = parseContributionsHtml(FRAGMENT)!;
    expect(parsed.days.map((d) => d.count)).toEqual([8, 0, 21, 1]);
    expect(parsed.approximate).toBe(false);
  });

  it('reads the yearly total from the heading', () => {
    expect(parseContributionsHtml(FRAGMENT)!.total).toBe(1234);
  });

  it('keeps the week grouping from the cell ids', () => {
    const parsed = parseContributionsHtml(FRAGMENT)!;
    expect(parsed.days[0].week).toBe(0);
    expect(parsed.days[3].week).toBe(1);
    expect(parsed.days[0].weekday).toBe(0); // Sunday
  });

  it('falls back to levels and flags approximate data when tooltips are missing', () => {
    const withoutTooltips = FRAGMENT.replace(/<tool-tip[\s\S]*?<\/tool-tip>/g, '');
    const parsed = parseContributionsHtml(withoutTooltips)!;
    expect(parsed.days.map((d) => d.count)).toEqual([2, 0, 4, 1]);
    expect(parsed.approximate).toBe(true);
  });

  it('returns null when there are no calendar cells', () => {
    expect(parseContributionsHtml('<html><body>Not Found</body></html>')).toBeNull();
  });
});

describe('parseContributionsJson', () => {
  // shape served by the community mirror: flat day list + totals
  const MIRROR = {
    total: { lastYear: 15 },
    contributions: [
      { date: '2026-09-06', count: 3, level: 1 }, // Sunday
      { date: '2026-09-07', count: 0, level: 0 },
      { date: '2026-09-08', count: 12, level: 4 },
      { date: '2026-09-13', count: 0, level: 0 }, // next Sunday
      { date: '2026-09-14', count: 5, level: 2 },
    ],
  };

  it('parses days and the yearly total', () => {
    const parsed = parseContributionsJson(MIRROR)!;
    expect(parsed.days.map((d) => d.count)).toEqual([3, 0, 12, 0, 5]);
    expect(parsed.total).toBe(15);
    expect(parsed.approximate).toBe(false);
  });

  it('starts a new week on every Sunday', () => {
    const parsed = parseContributionsJson(MIRROR)!;
    expect(parsed.days.map((d) => d.week)).toEqual([0, 0, 0, 1, 1]);
    expect(parsed.days[0].weekday).toBe(0);
    expect(parsed.days[4].weekday).toBe(1);
  });

  it('rejects malformed payloads', () => {
    expect(parseContributionsJson(null)).toBeNull();
    expect(parseContributionsJson({})).toBeNull();
    expect(parseContributionsJson({ total: { lastYear: 1 }, contributions: [] })).toBeNull();
    expect(
      parseContributionsJson({ total: { lastYear: 1 }, contributions: [{ date: 5, count: 1 }] }),
    ).toBeNull();
  });
});
