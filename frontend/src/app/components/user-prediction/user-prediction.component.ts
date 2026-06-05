import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { lastValueFrom } from 'rxjs';
import { PredictionService } from '../../services/prediction.service';

interface UserMatch {
  id: string;
  label: string;
  team1: string;
  team2: string;
  selectedWinner?: string;
  status?: string;
  source1?: string;
  source2?: string;
}

interface BestThirdCandidate {
  name: string;
  group: string;
  points: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  fair_play_points: number;
  thirdRank: number;
  qualifiedAsThird: boolean;
}

@Component({
  selector: 'app-user-prediction',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-prediction.component.html',
  styleUrls: ['./user-prediction.component.css']
})
export class UserPredictionComponent implements OnInit {
  loading = false;
  error = '';

  selectedRound = 'r32';
  roundComplete = false;

  roundOf32: UserMatch[] = [];
  roundOf16: UserMatch[] = [];
  quarterFinals: UserMatch[] = [];
  semiFinals: UserMatch[] = [];
  finalMatch: UserMatch | null = null;

  champion: string | null = null;
  bestThirdTeams: BestThirdCandidate[] = [];

  rounds = [
    { key: 'r32', label: 'Round of 32' },
    { key: 'r16', label: 'Round of 16' },
    { key: 'quarter', label: 'Quarter-finals' },
    { key: 'semi', label: 'Semi-finals' },
    { key: 'final', label: 'Final' }
  ];

  predictions: Map<string, string> = new Map();

  constructor(private predictionService: PredictionService) {}

  ngOnInit() {
    this.loadKnockoutBracket();
  }

  async loadKnockoutBracket() {
    this.loading = true;
    this.error = '';
    this.resetBracket();

    try {
      const data: any = await lastValueFrom(this.predictionService.getGroupStandings());
      const groups = data.all_groups || Object.values(data.groups || {});

      if (!groups?.length) {
        throw new Error('Group standings are not available.');
      }

      this.bestThirdTeams = this.computeBestThirds(groups);
      this.roundOf32 = this.buildRoundOf32(groups, this.bestThirdTeams);

      this.selectedRound = 'r32';
      this.roundComplete = false;
    } catch (err: any) {
      console.error(err);
      this.error = err?.message || 'Unable to load knockout bracket.';
    } finally {
      this.loading = false;
    }
  }

  resetBracket() {
    this.roundOf32 = [];
    this.roundOf16 = [];
    this.quarterFinals = [];
    this.semiFinals = [];
    this.finalMatch = null;
    this.champion = null;
    this.roundComplete = false;
    this.predictions.clear();
  }

  selectWinner(match: UserMatch, winner: string) {
    if (!winner || winner === 'TBD') return;

    match.selectedWinner = winner;
    this.predictions.set(match.id, winner);

    if (match.id === 'FINAL') {
      this.champion = winner;
    }

    this.updateNextRound();
    this.roundComplete = this.isRoundComplete(this.selectedRound);
  }

  selectRound(roundKey: string) {
    if (!this.canSelectRound(roundKey)) {
      const current = this.rounds.find(r => r.key === this.selectedRound);
      this.error = `Complete all matches in ${current?.label || 'this round'} before moving to the next round.`;
      return;
    }

    this.error = '';
    this.selectedRound = roundKey;
    this.roundComplete = this.isRoundComplete(roundKey);
  }

  goToNextRound() {
    if (!this.isRoundComplete(this.selectedRound)) {
      this.roundComplete = false;
      return;
    }

    this.updateNextRound();

    const currentIndex = this.rounds.findIndex(round => round.key === this.selectedRound);
    const nextRound = this.rounds[currentIndex + 1];

    if (nextRound) {
      this.selectedRound = nextRound.key;
      this.roundComplete = this.isRoundComplete(nextRound.key);
    }
  }

  canSelectRound(roundKey: string): boolean {
    const targetIndex = this.rounds.findIndex(round => round.key === roundKey);

    if (targetIndex === -1) return false;
    if (targetIndex === 0) return true;

    const previousRoundKey = this.rounds[targetIndex - 1].key;
    return this.isRoundComplete(previousRoundKey);
  }

  updateNextRound() {
  if (this.selectedRound === 'r32' && this.isRoundComplete('r32')) {
    this.roundOf16 = this.buildUserNextRound([
      { id: 'M89', source1: 'M74', source2: 'M77' },
      { id: 'M90', source1: 'M73', source2: 'M75' },
      { id: 'M91', source1: 'M83', source2: 'M84' },
      { id: 'M92', source1: 'M81', source2: 'M82' },
      { id: 'M93', source1: 'M76', source2: 'M78' },
      { id: 'M94', source1: 'M79', source2: 'M80' },
      { id: 'M95', source1: 'M85', source2: 'M88' },
      { id: 'M96', source1: 'M86', source2: 'M87' }
    ], this.roundOf32);
  }

  if (this.selectedRound === 'r16' && this.isRoundComplete('r16')) {
    this.quarterFinals = this.buildUserNextRound([
      { id: 'QF1', source1: 'M89', source2: 'M90' },
      { id: 'QF2', source1: 'M91', source2: 'M92' },
      { id: 'QF3', source1: 'M93', source2: 'M94' },
      { id: 'QF4', source1: 'M95', source2: 'M96' }
    ], this.roundOf16);
  }

  if (this.selectedRound === 'quarter' && this.isRoundComplete('quarter')) {
    this.semiFinals = this.buildUserNextRound([
      { id: 'SF1', source1: 'QF1', source2: 'QF2' },
      { id: 'SF2', source1: 'QF3', source2: 'QF4' }
    ], this.quarterFinals);
  }

  if (this.selectedRound === 'semi' && this.isRoundComplete('semi')) {
    const finalMatches = this.buildUserNextRound([
      { id: 'FINAL', source1: 'SF1', source2: 'SF2' }
    ], this.semiFinals);

    this.finalMatch = finalMatches[0] || null;
  }

  if (this.selectedRound === 'final' && this.finalMatch?.selectedWinner) {
    this.champion = this.finalMatch.selectedWinner;
  }
}

  getSelectedRoundTitle() {
    return this.rounds.find(round => round.key === this.selectedRound)?.label || 'Final';
  }

  getSelectedMatches(): UserMatch[] {
    return this.getRoundMatches(this.selectedRound);
  }

  getRoundMatches(roundKey: string): UserMatch[] {
    if (roundKey === 'r32') return this.roundOf32;
    if (roundKey === 'r16') return this.roundOf16;
    if (roundKey === 'quarter') return this.quarterFinals;
    if (roundKey === 'semi') return this.semiFinals;
    if (roundKey === 'final') return this.finalMatch ? [this.finalMatch] : [];
    return [];
  }

  isRoundComplete(roundKey: string): boolean {
    const matches = this.getRoundMatches(roundKey);
    return matches.length > 0 && matches.every(match => !!match.selectedWinner);
  }

  isTournamentComplete(): boolean {
    return !!this.finalMatch?.selectedWinner;
  }

  computeBestThirds(groups: any[]): BestThirdCandidate[] {
    const thirdTeams = groups
      .map(group => {
        const team = group.teams?.[2];
        if (!team) return null;

        const goalsFor = Number(team.goals_for || 0);
        const goalsAgainst = Number(team.goals_against || 0);

        return {
          ...team,
          group: group.group,
          goal_difference: goalsFor - goalsAgainst,
          fair_play_points: Number(team.fair_play_points || team.fairPlayPoints || 0),
          goals_for: goalsFor,
          goals_against: goalsAgainst,
          points: Number(team.points || 0)
        } as BestThirdCandidate;
      })
      .filter(Boolean) as BestThirdCandidate[];

    return thirdTeams
      .sort((a, b) =>
        b.points - a.points ||
        b.goal_difference - a.goal_difference ||
        b.goals_for - a.goals_for ||
        a.fair_play_points - b.fair_play_points ||
        a.group.localeCompare(b.group)
      )
      .map((team, index) => ({
        ...team,
        thirdRank: index + 1,
        qualifiedAsThird: index < 8
      }));
  }

  buildRoundOf32(groups: any[], bestThirds: BestThirdCandidate[]): UserMatch[] {
    const usedBestThird: Set<string> = new Set();

    const pickBestThird = (allowedGroups: string[]) => {
      const candidate = bestThirds.find(
        team => !usedBestThird.has(team.name) && allowedGroups.includes(team.group)
      );

      const selected = candidate || bestThirds.find(team => !usedBestThird.has(team.name));

      if (!selected) return 'TBD';

      usedBestThird.add(selected.name);
      return selected.name;
    };

    const getTeam = (groupLetter: string, position: number) => {
      const group = groups.find(g => g.group === groupLetter);
      return group?.teams?.[position - 1]?.name || 'TBD';
    };

    const defs = [
      { id: 'M73', team1: { group: 'A', pos: 2 }, team2: { group: 'B', pos: 2 } },
      { id: 'M74', team1: { group: 'E', pos: 1 }, team2: { bestThirdGroups: ['A', 'B', 'C', 'D', 'F'] } },
      { id: 'M75', team1: { group: 'F', pos: 1 }, team2: { group: 'C', pos: 2 } },
      { id: 'M76', team1: { group: 'C', pos: 1 }, team2: { group: 'F', pos: 2 } },
      { id: 'M77', team1: { group: 'I', pos: 1 }, team2: { bestThirdGroups: ['C', 'D', 'F', 'G', 'H'] } },
      { id: 'M78', team1: { group: 'E', pos: 2 }, team2: { group: 'I', pos: 2 } },
      { id: 'M79', team1: { group: 'A', pos: 1 }, team2: { bestThirdGroups: ['C', 'E', 'F', 'H', 'I'] } },
      { id: 'M80', team1: { group: 'L', pos: 1 }, team2: { bestThirdGroups: ['E', 'H', 'I', 'J', 'K'] } },
      { id: 'M81', team1: { group: 'D', pos: 1 }, team2: { bestThirdGroups: ['B', 'E', 'F', 'I', 'J'] } },
      { id: 'M82', team1: { group: 'G', pos: 1 }, team2: { bestThirdGroups: ['A', 'E', 'H', 'I', 'J'] } },
      { id: 'M83', team1: { group: 'K', pos: 2 }, team2: { group: 'L', pos: 2 } },
      { id: 'M84', team1: { group: 'H', pos: 1 }, team2: { group: 'J', pos: 2 } },
      { id: 'M85', team1: { group: 'J', pos: 1 }, team2: { group: 'H', pos: 2 } },
      { id: 'M86', team1: { group: 'B', pos: 1 }, team2: { bestThirdGroups: ['E', 'F', 'G', 'I', 'J'] } },
      { id: 'M87', team1: { group: 'K', pos: 1 }, team2: { bestThirdGroups: ['D', 'E', 'I', 'J', 'L'] } },
      { id: 'M88', team1: { group: 'D', pos: 2 }, team2: { group: 'G', pos: 2 } }
    ];

    return defs.map((def: any) => ({
      id: def.id,
      label: def.id,
      team1: def.team1.bestThirdGroups ? pickBestThird(def.team1.bestThirdGroups) : getTeam(def.team1.group, def.team1.pos),
      team2: def.team2.bestThirdGroups ? pickBestThird(def.team2.bestThirdGroups) : getTeam(def.team2.group, def.team2.pos),
      status: this.getStageName(def.id),
      source1: 'R32',
      source2: 'R32'
    }));
  }

  buildUserNextRound(
    defs: Array<{ id: string; source1: string; source2: string }>,
    previousRound: UserMatch[]
  ): UserMatch[] {
    return defs.map(def => ({
      id: def.id,
      label: def.id,
      team1: previousRound.find(match => match.id === def.source1)?.selectedWinner || 'TBD',
      team2: previousRound.find(match => match.id === def.source2)?.selectedWinner || 'TBD',
      status: this.getStageName(def.id),
      source1: def.source1,
      source2: def.source2
    }));
  }

  getStageName(matchId: string) {
    if (matchId.startsWith('QF')) return 'Quarter-finals';
    if (matchId.startsWith('SF')) return 'Semi-finals';
    if (matchId === 'FINAL') return 'Final';
    if (['M89', 'M90', 'M91', 'M92', 'M93', 'M94', 'M95', 'M96'].includes(matchId)) return 'Round of 16';
    return 'Round of 32';
  }

  getMatchLabel(match: UserMatch) {
    return `${match.id} - ${this.getStageName(match.id)}`;
  }

  generatePredictionsSummary() {
    const rounds = [
      { name: 'Round of 32', matches: this.roundOf32 },
      { name: 'Round of 16', matches: this.roundOf16 },
      { name: 'Quarter-finals', matches: this.quarterFinals },
      { name: 'Semi-finals', matches: this.semiFinals },
      { name: 'Final', matches: this.finalMatch ? [this.finalMatch] : [] }
    ];

    const predictions: any[] = [];

    rounds.forEach(round => {
      round.matches.forEach(match => {
        predictions.push({
          Round: round.name,
          Match: match.id,
          'Team 1': match.team1,
          'Team 2': match.team2,
          'Your Winner': match.selectedWinner || '-',
          Status: match.selectedWinner ? 'Complete' : 'Incomplete'
        });
      });
    });

    return predictions;
  }

  downloadPDF() {
    const predictions = this.generatePredictionsSummary();
    const completed = predictions.filter(row => row.Status === 'Complete').length;
    const champion = this.finalMatch?.selectedWinner || this.champion || 'Not selected yet';

    const rows = predictions.map(row => `
      <tr>
        <td>${this.escapeHtml(row.Round)}</td>
        <td>${this.escapeHtml(row.Match)}</td>
        <td>${this.escapeHtml(row['Team 1'])}</td>
        <td>${this.escapeHtml(row['Team 2'])}</td>
        <td>${this.escapeHtml(row['Your Winner'])}</td>
        <td>${this.escapeHtml(row.Status)}</td>
      </tr>
    `).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>World Cup 2026 Predictions</title>
          <style>
            body { margin: 0; padding: 32px; font-family: Arial, sans-serif; color: #041e42; background: #f4f7fb; }
            .cover { padding: 28px; border-radius: 20px; color: white; background: linear-gradient(135deg, #041e42, #073b35); }
            .cover span { color: #ffd700; font-size: 12px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; }
            h1 { margin: 10px 0; font-size: 38px; }
            .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
            .box { padding: 16px; border-radius: 14px; background: white; }
            .box small { display: block; color: #64748b; font-weight: 800; text-transform: uppercase; }
            .box strong { display: block; margin-top: 6px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; background: white; }
            th { padding: 12px; color: white; background: #041e42; text-align: left; font-size: 12px; text-transform: uppercase; }
            td { padding: 11px 12px; border-bottom: 1px solid #e5edf4; font-size: 13px; }
            td:nth-child(5) { font-weight: 900; color: #007f6a; }
          </style>
        </head>
        <body>
          <section class="cover">
            <span>FIFA World Cup 2026</span>
            <h1>My Knockout Prediction Report</h1>
            <p>Generated from your custom knockout bracket picks.</p>
          </section>

          <section class="summary">
            <div class="box"><small>Champion</small><strong>${this.escapeHtml(champion)}</strong></div>
            <div class="box"><small>Completed Picks</small><strong>${completed}/${predictions.length}</strong></div>
            <div class="box"><small>Generated</small><strong>${new Date().toLocaleDateString()}</strong></div>
          </section>

          <table>
            <thead>
              <tr>
                <th>Round</th>
                <th>Match</th>
                <th>Team 1</th>
                <th>Team 2</th>
                <th>Your Winner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Popup blocked. Please allow popups to export PDF.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  escapeHtml(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}