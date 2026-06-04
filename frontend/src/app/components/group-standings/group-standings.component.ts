import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { PredictionService } from '../../services/prediction.service';

@Component({
  selector: 'app-group-standings',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './group-standings.component.html',
  styleUrls: ['./group-standings.component.css']
})
export class GroupStandingsComponent implements OnInit {
  groupStandings: any[] = [];
  bestThirdPlacedTeams: any[] = [];
  loading = false;
  error = '';

  groupEmojis: any = {
    A: '🇲🇽',
    B: '🇨🇦',
    C: '🇧🇷',
    D: '🇺🇸',
    E: '🇩🇪',
    F: '🇳🇱',
    G: '🇧🇪',
    H: '🇪🇸',
    I: '🇫🇷',
    J: '🇦🇷',
    K: '🇵🇹',
    L: '🏴'
  };

  groupNames: any = {
    A: 'Group A',
    B: 'Group B',
    C: 'Group C',
    D: 'Group D',
    E: 'Group E',
    F: 'Group F',
    G: 'Group G',
    H: 'Group H',
    I: 'Group I',
    J: 'Group J',
    K: 'Group K',
    L: 'Group L'
  };

  constructor(private predictionService: PredictionService) {}

  ngOnInit() {
    this.loadGroupStandings();
  }

  loadGroupStandings() {
    this.loading = true;
    this.error = '';
    this.groupStandings = [];
    this.bestThirdPlacedTeams = [];

    this.predictionService.getGroupStandings().subscribe({
      next: (data) => {
        if (data.all_groups) {
          this.groupStandings = data.all_groups;
        } else if (data.groups) {
          this.groupStandings = Object.values(data.groups) as any[];
        }

        this.buildBestThirdPlacedRanking();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading group standings:', err);
        this.error = 'Failed to load group standings. Check backend on localhost:3000.';
        this.loading = false;
      }
    });
  }

  buildBestThirdPlacedRanking() {
    this.bestThirdPlacedTeams = this.groupStandings
      .map((group) => {
        const thirdTeam = group.teams?.[2];

        if (!thirdTeam) return null;

        const goalsFor = Number(thirdTeam.goals_for || 0);
        const goalsAgainst = Number(thirdTeam.goals_against || 0);

        return {
          ...thirdTeam,
          group: group.group,
          goal_difference: goalsFor - goalsAgainst,
          fair_play_points: Number(thirdTeam.fair_play_points || thirdTeam.fairPlayPoints || 0)
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        Number(b.points || 0) - Number(a.points || 0) ||
        Number(b.goal_difference || 0) - Number(a.goal_difference || 0) ||
        Number(b.goals_for || 0) - Number(a.goals_for || 0) ||
        Number(a.fair_play_points || 0) - Number(b.fair_play_points || 0) ||
        String(a.group).localeCompare(String(b.group))
      )
      .map((team, index) => ({
        ...team,
        thirdRank: index + 1,
        qualifiedAsThird: index < 8
      }));
  }

  getGroupEmoji(group: string): string {
    return this.groupEmojis[group] || '⚽';
  }

  getGroupName(group: string): string {
    return this.groupNames[group] || `Group ${group}`;
  }

  getQualifiedTeams(teams: any[]): any[] {
    return teams.slice(0, 2);
  }

  getThirdPlace(teams: any[]): any {
    return teams[2];
  }

  getGoalDifference(team: any): number {
    return Number(team.goals_for || 0) - Number(team.goals_against || 0);
  }
}