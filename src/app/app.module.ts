import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LaneDepartOneComponent } from './lane-depart-one/lane-depart-one.component';
import { LaneDepartTwoComponent } from './lane-depart-two/lane-depart-two.component';

@NgModule({
  declarations: [
    AppComponent,
    LaneDepartOneComponent,
    LaneDepartTwoComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
