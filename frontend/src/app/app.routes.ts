import { Routes } from '@angular/router';
import { PredictorComponent } from './components/predictor/predictor.component';
import { GroupStandingsComponent } from './components/group-standings/group-standings.component';
import { KnockoutBracketComponent } from './components/knockout-bracket/knockout-bracket.component';
import { UserPredictionComponent } from './components/user-prediction/user-prediction.component';

export const routes: Routes = [
  { path: '', component: PredictorComponent },
  { path: 'user-prediction', component: UserPredictionComponent },
  { path: 'groupstandings', component: GroupStandingsComponent },
  { path: 'knockout', component: KnockoutBracketComponent },
  { path: '**', redirectTo: '' }
];