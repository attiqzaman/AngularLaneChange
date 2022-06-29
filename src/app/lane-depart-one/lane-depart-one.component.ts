import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { plainToInstance } from 'class-transformer';
import { readFileContent } from '../core/FileReader';
import { PrintSections, PrintSnapshots } from '../core/FileSaver';
import { ProcessedRouteWrapper } from '../core/ProcessedRouteWrapper';
import { Snapshot } from '../core/Snapshot';
import { ConvertLatLngToSnapshots, drawSections } from '../core/Util';

@Component({
  selector: 'app-lane-depart-one',
  templateUrl: './lane-depart-one.component.html',
  styleUrls: ['./lane-depart-one.component.scss']
})
export class LaneDepartOneComponent implements OnInit {

  CarSnapshots: Snapshot[] = [];

  constructor(private router: Router) { }

  ngOnInit(): void {
  }
  
  async onCarRouteFileSelected(event: any) {
		const file:File = event.target.files[0];

		if (file) {
			const fileContent = await readFileContent(file);
			this.CarSnapshots = plainToInstance(Snapshot, JSON.parse(fileContent));
		}
	}

  onDownloadCarRouteRrhFiles() {
    if (this.CarSnapshots.length === 0) {
      alert("No Car Route file uploaded.");
      return;
    }

    let rawParameters = (document.getElementById("LowPassFilterParameters") as HTMLInputElement).value.split(',');
    let cutOffFrequency1 = Number(rawParameters[0].trim());
    let cutOffFrequency2 = Number(rawParameters[1].trim());
		if (cutOffFrequency1 === undefined || cutOffFrequency2 === undefined) {
      throw new Error("latLong not found.")
    }

    let route = new ProcessedRouteWrapper("UI_Car", "carRoute", cutOffFrequency1, cutOffFrequency2, this.CarSnapshots, false);
    PrintSections(route);
	}
}
