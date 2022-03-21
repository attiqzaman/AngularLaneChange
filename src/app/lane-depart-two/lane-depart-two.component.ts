import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-lane-depart-two',
  templateUrl: './lane-depart-two.component.html',
  styleUrls: ['./lane-depart-two.component.scss']
})
export class LaneDepartTwoComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }
  drawRoute() {
    alert("DRAW ROUTE")
  }
  drawPoints() {
    alert("DRAW POINTS")
  }
  onFileChanged(event: any) {
    const selectedFile = event.target.files[0];
    const fileReader = new FileReader();
    fileReader.readAsText(selectedFile, "UTF-8");
    fileReader.onload = () => {
     const a = JSON.parse(fileReader.result as any);
     console.log(a);
    }
    fileReader.onerror = (error) => {
      console.log(error);
    }
  }
}
