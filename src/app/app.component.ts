import { MapService } from './core/map.service';
import { Component } from '@angular/core';

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
  constructor(private mapService: MapService) {
    (window as any).initMap  = mapService.initMap;
    (window as any).calculateAndDisplayRoute  = mapService.calculateAndDisplayRoute;
    (window as any).interpolatePoints  = mapService.interpolatePoints;

  }
}
