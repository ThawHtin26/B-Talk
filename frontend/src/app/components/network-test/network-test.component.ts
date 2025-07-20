import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NetworkTestService, NetworkTestResult } from '../../services/network-test.service';

@Component({
  selector: 'app-network-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="network-test-container">
      <h3>Network Connectivity Test</h3>
      
      <div class="test-section">
        <h4>Media Access Test</h4>
        <button (click)="testMediaAccess()" [disabled]="isTesting">Test Media Access</button>
        <div *ngIf="mediaTestResult" class="result" [class.success]="mediaTestResult.success" [class.error]="!mediaTestResult.success">
          {{ mediaTestResult.message }}
        </div>
      </div>

      <div class="test-section">
        <h4>TURN Server Tests</h4>
        <button (click)="testTURNServers()" [disabled]="isTesting">Test TURN Servers</button>
        <div *ngFor="let result of turnTestResults" class="result" [class.success]="result.success" [class.error]="!result.success">
          {{ result.message }}
        </div>
      </div>

      <div class="test-section">
        <h4>WebRTC Connection Test</h4>
        <button (click)="testWebRTCConnection()" [disabled]="isTesting">Test WebRTC Connection</button>
        <div *ngIf="webrtcTestResult" class="result" [class.success]="webrtcTestResult.success" [class.error]="!webrtcTestResult.success">
          {{ webrtcTestResult.message }}
        </div>
      </div>

      <div class="test-section">
        <h4>Full Network Test</h4>
        <button (click)="runFullTest()" [disabled]="isTesting">Run Full Test</button>
        <div *ngIf="fullTestResults" class="full-test-results">
          <h5>Test Results:</h5>
          <div class="result" [class.success]="fullTestResults.mediaAccess.success" [class.error]="!fullTestResults.mediaAccess.success">
            Media Access: {{ fullTestResults.mediaAccess.message }}
          </div>
          <div class="result" [class.success]="fullTestResults.webrtcConnection.success" [class.error]="!fullTestResults.webrtcConnection.success">
            WebRTC Connection: {{ fullTestResults.webrtcConnection.message }}
          </div>
          <div class="result" [class.success]="turnServersWorking" [class.error]="!turnServersWorking">
            TURN Servers: {{ turnServersWorking ? 'Working' : 'Issues detected' }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .network-test-container {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .test-section {
      margin-bottom: 20px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }

    button {
      background-color: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin-bottom: 10px;
    }

    button:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    .result {
      padding: 10px;
      margin: 5px 0;
      border-radius: 3px;
      font-family: monospace;
      font-size: 14px;
    }

    .result.success {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .result.error {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .full-test-results {
      margin-top: 15px;
    }

    h3, h4, h5 {
      margin-top: 0;
    }
  `]
})
export class NetworkTestComponent {
  isTesting = false;
  mediaTestResult: NetworkTestResult | null = null;
  turnTestResults: NetworkTestResult[] = [];
  webrtcTestResult: NetworkTestResult | null = null;
  fullTestResults: any = null;
  turnServersWorking = false;

  constructor(private networkTestService: NetworkTestService) {}

  async testMediaAccess() {
    this.isTesting = true;
    this.mediaTestResult = await this.networkTestService.testMediaAccess();
    this.isTesting = false;
  }

  async testTURNServers() {
    this.isTesting = true;
    this.turnTestResults = await this.networkTestService.testAllTURNServers();
    this.isTesting = false;
  }

  async testWebRTCConnection() {
    this.isTesting = true;
    this.webrtcTestResult = await this.networkTestService.testWebRTCConnection();
    this.isTesting = false;
  }

  async runFullTest() {
    this.isTesting = true;
    this.fullTestResults = await this.networkTestService.runFullNetworkTest();
    this.turnServersWorking = this.fullTestResults.turnServers.some((result: NetworkTestResult) => result.success);
    this.isTesting = false;
  }
} 