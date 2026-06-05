import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { lastValueFrom, forkJoin } from 'rxjs';
import { PredictionService } from '../../services/prediction.service';

interface KnockoutMatch {
  id: string;
  label: string;
  team1: string;
  team2: string;
  winner?: string;
  score?: string;
  note?: string;
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
  selector: 'app-knockout-bracket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knockout-bracket.component.html',
  styleUrls: ['./knockout-bracket.component.css']
})
export class KnockoutBracketComponent implements OnInit {
  loading = false;
  error = '';

  selectedRound = 'final';

  roundOf32: KnockoutMatch[] = [];
  roundOf16: KnockoutMatch[] = [];
  quarterFinals: KnockoutMatch[] = [];
  semiFinals: KnockoutMatch[] = [];
  finalMatch: KnockoutMatch | null = null;
  champion: string | null = null;
  bestThirdTeams: BestThirdCandidate[] = [];

  rounds = [
  { key: 'r32', label: 'Round of 32' },
  { key: 'r16', label: 'Round of 16' },
  { key: 'quarter', label: 'Quarter-finals' },
  { key: 'semi', label: 'Semi-finals' },
  { key: 'final', label: 'Final' }
];

  constructor(private predictionService: PredictionService) {}

  ngOnInit() {
    this.loadKnockoutBracket();
  }

  selectRound(round: string) {
    this.selectedRound = round;
  }

  getSelectedRoundTitle() {
    const found = this.rounds.find(round => round.key === this.selectedRound);
    return found?.label || 'Final';
  }

  getSelectedMatches(): KnockoutMatch[] {
    if (this.selectedRound === 'semi') return this.semiFinals;
    if (this.selectedRound === 'quarter') return this.quarterFinals;
    if (this.selectedRound === 'r16') return this.roundOf16;
    if (this.selectedRound === 'r32') return this.roundOf32;
    return this.finalMatch ? [this.finalMatch] : [];
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

      const bestThirds = this.computeBestThirds(groups);
      this.bestThirdTeams = bestThirds;

      this.roundOf32 = this.buildRoundOf32(groups, bestThirds);
      this.roundOf32 = await this.predictMatches(this.roundOf32);

      this.roundOf16 = await this.buildNextRound(
        [
          { id: 'M89', source1: 'M74', source2: 'M77' },
          { id: 'M90', source1: 'M73', source2: 'M75' },
          { id: 'M91', source1: 'M83', source2: 'M84' },
          { id: 'M92', source1: 'M81', source2: 'M82' },
          { id: 'M93', source1: 'M76', source2: 'M78' },
          { id: 'M94', source1: 'M79', source2: 'M80' },
          { id: 'M95', source1: 'M85', source2: 'M88' },
          { id: 'M96', source1: 'M86', source2: 'M87' }
        ],
        this.roundOf32
      );

      this.quarterFinals = await this.buildNextRound(
        [
          { id: 'QF1', source1: 'M89', source2: 'M90' },
          { id: 'QF2', source1: 'M91', source2: 'M92' },
          { id: 'QF3', source1: 'M93', source2: 'M94' },
          { id: 'QF4', source1: 'M95', source2: 'M96' }
        ],
        this.roundOf16
      );

      this.semiFinals = await this.buildNextRound(
        [
          { id: 'SF1', source1: 'QF1', source2: 'QF2' },
          { id: 'SF2', source1: 'QF3', source2: 'QF4' }
        ],
        this.quarterFinals
      );

      const finalMatches = await this.buildNextRound(
        [{ id: 'FINAL', source1: 'SF1', source2: 'SF2' }],
        this.semiFinals
      );

      this.finalMatch = finalMatches[0] || null;
      this.champion = this.finalMatch?.winner || null;
      this.selectedRound = 'final';
    } catch (err: any) {
      console.error(err);
      this.error = err?.message || 'Unable to build knockout bracket.';
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
      .map((team, index) => ({ ...team, thirdRank: index + 1, qualifiedAsThird: index < 8 }));
  }

  buildRoundOf32(groups: any[], bestThirds: BestThirdCandidate[]): KnockoutMatch[] {
    const usedBestThird: Set<string> = new Set();

    const pickBestThird = (allowedGroups: string[]) => {
      const candidate = bestThirds.find(
        team => !usedBestThird.has(team.name) && allowedGroups.includes(team.group)
      );

      if (!candidate) {
        const fallback = bestThirds.find(team => !usedBestThird.has(team.name));
        if (fallback) {
          usedBestThird.add(fallback.name);
          return fallback.name;
        }
        return 'TBD';
      }

      usedBestThird.add(candidate.name);
      return candidate.name;
    };

    const getTeam = (groupLetter: string, position: number) => {
      const group = groups.find(g => g.group === groupLetter);
      return group?.teams?.[position - 1]?.name || 'TBD';
    };

    const defs: Array<{
      id: string;
      label: string;
      team1: { group: string; pos: number } | { bestThirdGroups: string[] };
      team2: { group: string; pos: number } | { bestThirdGroups: string[] };
    }> = [
      { id: 'M73', label: 'M73', team1: { group: 'A', pos: 2 }, team2: { group: 'B', pos: 2 } },
      { id: 'M74', label: 'M74', team1: { group: 'E', pos: 1 }, team2: { bestThirdGroups: ['A', 'B', 'C', 'D', 'F'] } },
      { id: 'M75', label: 'M75', team1: { group: 'F', pos: 1 }, team2: { group: 'C', pos: 2 } },
      { id: 'M76', label: 'M76', team1: { group: 'C', pos: 1 }, team2: { group: 'F', pos: 2 } },
      { id: 'M77', label: 'M77', team1: { group: 'I', pos: 1 }, team2: { bestThirdGroups: ['C', 'D', 'F', 'G', 'H'] } },
      { id: 'M78', label: 'M78', team1: { group: 'E', pos: 2 }, team2: { group: 'I', pos: 2 } },
      { id: 'M79', label: 'M79', team1: { group: 'A', pos: 1 }, team2: { bestThirdGroups: ['C', 'E', 'F', 'H', 'I'] } },
      { id: 'M80', label: 'M80', team1: { group: 'L', pos: 1 }, team2: { bestThirdGroups: ['E', 'H', 'I', 'J', 'K'] } },
      { id: 'M81', label: 'M81', team1: { group: 'D', pos: 1 }, team2: { bestThirdGroups: ['B', 'E', 'F', 'I', 'J'] } },
      { id: 'M82', label: 'M82', team1: { group: 'G', pos: 1 }, team2: { bestThirdGroups: ['A', 'E', 'H', 'I', 'J'] } },
      { id: 'M83', label: 'M83', team1: { group: 'K', pos: 2 }, team2: { group: 'L', pos: 2 } },
      { id: 'M84', label: 'M84', team1: { group: 'H', pos: 1 }, team2: { group: 'J', pos: 2 } },
      { id: 'M85', label: 'M85', team1: { group: 'J', pos: 1 }, team2: { group: 'H', pos: 2 } },
      { id: 'M86', label: 'M86', team1: { group: 'B', pos: 1 }, team2: { bestThirdGroups: ['E', 'F', 'G', 'I', 'J'] } },
      { id: 'M87', label: 'M87', team1: { group: 'K', pos: 1 }, team2: { bestThirdGroups: ['D', 'E', 'I', 'J', 'L'] } },
      { id: 'M88', label: 'M88', team1: { group: 'D', pos: 2 }, team2: { group: 'G', pos: 2 } }
    ];

    return defs.map(def => {
      const team1 = 'bestThirdGroups' in def.team1 ? pickBestThird(def.team1.bestThirdGroups) : getTeam(def.team1.group, def.team1.pos);
      const team2 = 'bestThirdGroups' in def.team2 ? pickBestThird(def.team2.bestThirdGroups) : getTeam(def.team2.group, def.team2.pos);

      return {
        id: def.id,
        label: def.label,
        team1,
        team2,
        status: 'Round of 32',
        source1: 'R32',
        source2: 'R32'
      };
    });
  }

  async buildNextRound(defs: Array<{ id: string; source1: string; source2: string }>, previousRound: KnockoutMatch[]) {
    const round = defs.map(def => {
      const team1 = previousRound.find(m => m.id === def.source1)?.winner || 'TBD';
      const team2 = previousRound.find(m => m.id === def.source2)?.winner || 'TBD';

      return {
        id: def.id,
        label: def.id,
        team1,
        team2,
        status: this.getStageName(def.id),
        source1: def.source1,
        source2: def.source2
      };
    });

    return this.predictMatches(round);
  }

  async predictMatches(matches: KnockoutMatch[]) {
    const validMatches = matches.filter(match => match.team1 !== 'TBD' && match.team2 !== 'TBD');

    if (!validMatches.length) {
      return matches;
    }

    const predictions = await lastValueFrom(
      forkJoin(validMatches.map(match =>
        this.predictionService.predictKnockoutMatch(match.team1, match.team2)
      ))
    );

    return matches.map(match => {
      if (match.team1 === 'TBD' || match.team2 === 'TBD') {
        return match;
      }

      const pred = predictions.shift();
      const winner = this.resolveWinner(pred);
      const note = this.getPenaltyNote(pred, winner);

      return {
        ...match,
        score: pred.predicted_score,
        winner,
        note,
        status: `${match.id} - ${this.getStageName(match.id)}`
      };
    });
  }

  getPenaltyNote(pred: any, winner: string | undefined) {
    if (pred?.note) return pred.note;

    const score = String(pred?.predicted_score || '');
    const [g1, g2] = score.split(' - ').map(Number);

    if (Number.isFinite(g1) && Number.isFinite(g2) && g1 === g2 && winner) {
      return 'Winner after extra time / penalties';
    }

    return undefined;
  }

  resolveWinner(pred: any) {
    if (pred?.winner) return pred.winner;

    const rating1 = Number(pred?.team1_stats?.rating || 0);
    const rating2 = Number(pred?.team2_stats?.rating || 0);

    if (rating1 !== rating2) {
      return rating1 > rating2 ? pred.team1 : pred.team2;
    }

    return pred.team1;
  }

  getStageName(matchId: string) {
    if (matchId.startsWith('M')) return 'Round of 32';
    if (matchId.startsWith('QF')) return 'Quarter-finals';
    if (matchId.startsWith('SF')) return 'Semi-finals';
    if (matchId === 'FINAL') return 'Final';
    return 'Round of 16';
  }

  getMatchLabel(match: KnockoutMatch) {
    return `${match.id} • ${this.getStageName(match.id)}`;
  }
}