import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { Navbar } from './components/navbar/navbar';

@NgModule({
  declarations: [
    App,
    Navbar
  ],
  imports: [
    AppRoutingModule,
    BrowserModule,
    MatMenuModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners()
  ],
  bootstrap: [App]
})
export class AppModule { }
