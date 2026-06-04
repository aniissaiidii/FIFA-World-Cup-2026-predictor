import { Routes } from '@angular/router';
import { PredictorComponent } from './components/predictor/predictor.component';
import { RankingComponent } from './components/ranking/ranking.component';

export const routes: Routes = [
  { path: '', component: PredictorComponent },
  { path: 'ranking', component: RankingComponent },
  { path: '**', redirectTo: '' }
];