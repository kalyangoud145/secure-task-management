import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardComponent, RouterModule],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'], 
})
export class App {
  protected title = 'dashboard';
}
