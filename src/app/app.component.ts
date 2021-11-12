import { Component } from '@angular/core';
import { EmployeeService } from './services/employee.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  employeeList: any[];

  constructor(employeeService: EmployeeService) {
    this.employeeList = [];
    const { fetchEmployee, transformEmployeeInfo } = employeeService;

    fetchEmployee().subscribe((emps) => {
      const resultEmp = emps.map((empInfo: any) =>
        transformEmployeeInfo(empInfo)
      );

      this.employeeList = resultEmp;
    });
  }
}
