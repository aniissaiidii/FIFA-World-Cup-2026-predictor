import { Routes } from '@angular/router';
import { PredictorComponent } from './components/predictor/predictor.component';
import { RankingComponent } from './components/ranking/ranking.component';
import { GroupStandingsComponent } from './components/group-standings/group-standings.component';
import { KnockoutBracketComponent } from './components/knockout-bracket/knockout-bracket.component';

export const routes: Routes = [
  { path: '', component: PredictorComponent },
  { path: 'ranking', component: RankingComponent },
  { path: 'groupstandings', component: GroupStandingsComponent },
  { path: 'knockout', component: KnockoutBracketComponent },
  { path: '**', redirectTo: '' }
];