import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LaneDepartOneComponent } from './lane-depart-one/lane-depart-one.component';
import { LaneDepartTwoComponent } from './lane-depart-two/lane-depart-two.component';

const routes: Routes = [
  { path: '', redirectTo: 'lane1', pathMatch: 'full'},
  {path: 'lane1', component: LaneDepartOneComponent},
  {path: 'lane2', component: LaneDepartTwoComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
