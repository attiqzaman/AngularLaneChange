import { Component, OnInit } from '@angular/core';
import { Section } from '../core/Section';
import { plainToInstance } from "class-transformer";
import { Snapshot } from '../core/Snapshot';
import { LaneDepartureRoutine } from '../core/LaneDepartureRoutine';
import { MapService } from '../core/map.service';

@Component({
	selector: 'app-lane-depart-two',
	templateUrl: './lane-depart-two.component.html',
	styleUrls: ['./lane-depart-two.component.scss']
})
export class LaneDepartTwoComponent implements OnInit {
	sections: Section[] = [];
	gpsSnapshots: Snapshot[] = [];

	// constructor(private readJsonService: ReadJsonService) { }
	// constructor(private http: HttpClient) { }
	constructor(private service: MapService) {
	 }

	ngOnInit(): void {
	}
	drawRoute() {
		alert("DRAW ROUTE")
	}
	drawPoints() {
		alert("DRAW POINTS")
	}

	async onSectionsFileSelected(event: any) {

		const file:File = event.target.files[0];

		if (file) {
			const fileContent = await this.readFileContent(file);
			this.sections = plainToInstance(Section, JSON.parse(fileContent));
		}
	}

	async onRouteFileSelected(event: any) {
		const file:File = event.target.files[0];

		if (file) {
			const fileContent = await this.readFileContent(file);
			this.gpsSnapshots = plainToInstance(Snapshot, JSON.parse(fileContent));
			let test = 23;
		}
	}

	onProcessLaneDepartureWarning() {
		let warningRoutine = new LaneDepartureRoutine(this.sections, this.gpsSnapshots, this.service);
	}

	readFileContent(file: File): Promise<string> {
		return new Promise<string>((resolve, reject) => {
				if (!file) {
						resolve('');
				}

				const reader = new FileReader();

				reader.onload = (e) => {
					if (reader.result !== null) {
						const text = reader.result.toString();
						resolve(text);
					} else {
						resolve("no data");
					}
				};

				reader.readAsText(file);
		});
	}

	drawPoint(pt: google.maps.LatLng, map: google.maps.Map<Element>) {
		var marker = new google.maps.Marker({
			position: pt,
			icon: {
				path: google.maps.SymbolPath.CIRCLE,
				fillColor: '#F00',
				fillOpacity: 0.6,
				strokeColor: '#F00',
				strokeOpacity: 0.9,
				strokeWeight: 1,
				scale: 3
			}
		});

		// To add the marker to the map, call setMap();
		marker.setMap(map);
	}
}
