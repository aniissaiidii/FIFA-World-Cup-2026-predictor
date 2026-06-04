import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PredictionService } from '../../services/prediction.service';

@Component({
  selector: 'app-predictor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './predictor.component.html',
  styleUrls: ['./predictor.component.css']
})
export class PredictorComponent {
  selectedGroup = 'A';
  selectedMatchIndex = 0;

  matches: any[] = [];
  prediction: any = null;
  loading = false;
  error = '';

  groups: any = {
    A: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'],
    B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
    C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
    D: ['United States', 'Paraguay', 'Australia', 'Türkiye'],
    E: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'],
    F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
    G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
    H: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'],
    I: ['France', 'Senegal', 'Iraq', 'Norway'],
    J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
    K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
    L: ['England', 'Croatia', 'Ghana', 'Panama']
  };

  constructor(private predictionService: PredictionService) {
    this.updateMatches();
  }

  onGroupChange() {
    this.updateMatches();
  }

  selectMatch(index: number) {
    this.selectedMatchIndex = index;
    this.prediction = null;
    this.error = '';
  }

  updateMatches() {
    const t = this.groups[this.selectedGroup];

    this.matches = [
      { team1: t[0], team2: t[1], stage: `Group ${this.selectedGroup}` },
      { team1: t[2], team2: t[3], stage: `Group ${this.selectedGroup}` },
      { team1: t[0], team2: t[2], stage: `Group ${this.selectedGroup}` },
      { team1: t[1], team2: t[3], stage: `Group ${this.selectedGroup}` },
      { team1: t[0], team2: t[3], stage: `Group ${this.selectedGroup}` },
      { team1: t[1], team2: t[2], stage: `Group ${this.selectedGroup}` }
    ];

    this.selectedMatchIndex = 0;
    this.prediction = null;
    this.error = '';
  }

  predictMatch() {
    const match = this.matches[this.selectedMatchIndex];

    if (!match) {
      this.error = 'Select a match';
      return;
    }

    this.loading = true;
    this.error = '';
    this.prediction = null;

    this.predictionService.predictMatch(match.team1, match.team2).subscribe({
      next: (data) => {
        console.log('BACKEND RESULT:', data);
        this.prediction = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Prediction failed. Check backend on localhost:3000.';
        this.loading = false;
      }
    });
  }
}