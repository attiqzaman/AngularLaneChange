import { MapService } from './core/map.service';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'tsmaps';
  /**
   *
   */
  constructor(private mapService: MapService, private router: Router) {
    (window as any).initMap  = mapService.initMap;
    (window as any).calculateAndDisplayRoute  = mapService.calculateAndDisplayRoute;
    (window as any).interpolatePoints  = mapService.interpolatePoints;
  }
  async navigate2() {
    await this.router.navigateByUrl('/lane2')
    location.reload();
  }
  async navigate1() {
    await this.router.navigateByUrl('/lane1')
    location.reload();
  }
}
