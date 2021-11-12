import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface Employee {
  employeeid: number;
  firstname: string;
  lastname: string;
  birthdate: string;
  startdate: string;
  employeetype: string;
  salary: number;
  pvfrate: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  configJsonUrl = 'assets/_files/employees.json';
  configMonthjoinPvf = 3;
  interestGroveBondRate = 2;

  constructor(private http: HttpClient) {}

  private calAgeEmployee(birthdate: string) {
    const birthYear: number = parseInt(birthdate.split('/')[2]);
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    return age;
  }

  private handleStartDateFormat = (startdate: string) => {
    const arr = startdate?.split('/') || [];

    return {
      startDate: parseInt(arr[0]),
      startMonth: parseInt(arr[1]),
      startYear: parseInt(arr[2]),
    };
  };

  private calWorkingTimeAccumulated = (startdate: string) => {
    const { handleStartDateFormat } = this;
    const { startMonth, startYear } = handleStartDateFormat(startdate);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const yearAccumulated = currentDate.getFullYear() - startYear;

    let monthAccumulated = currentMonth + 1 - startMonth;
    let workingYearAccumulated = 0;

    if (yearAccumulated < 1) {
      return { monthAccumulated, workingYearAccumulated };
    }

    const monthAccumulatedFirstYear = 13 - startMonth;
    const fullyearAccumulated = (yearAccumulated - 1) * 12;

    monthAccumulated =
      monthAccumulatedFirstYear + currentMonth + fullyearAccumulated;
    workingYearAccumulated = Math.floor(monthAccumulated / 12);

    return { monthAccumulated, workingYearAccumulated };
  };

  private calSalaryAccumulated = (empInfo: {
    salary: number;
    startdate: string;
  }) => {
    const { calWorkingTimeAccumulated } = this;
    const { salary, startdate } = empInfo;
    const { monthAccumulated } = calWorkingTimeAccumulated(startdate);

    return monthAccumulated ? salary * monthAccumulated : salary;
  };

  private calCompanyConAccumulated = (salaryAccumulated: number) => {
    return salaryAccumulated * 0.1;
  };

  private isJoinPvfProgram = (monthAccumulated: number) =>
    monthAccumulated <= this.configMonthjoinPvf ? false : true;

  private calPvfAccumulated = (empInfo: {
    salary: number;
    salaryAccumulated: number;
    pvfrate: number | null;
    employeetype: string;
    startdate: string;
  }) => {
    const { calWorkingTimeAccumulated, isJoinPvfProgram } = this;
    const { salaryAccumulated, employeetype, pvfrate, startdate, salary } =
      empInfo;
    const { monthAccumulated } = calWorkingTimeAccumulated(startdate);
    const isJoinPvf = isJoinPvfProgram(monthAccumulated);

    if (employeetype !== 'Permanent' || !isJoinPvf) {
      return 0;
    }

    const resultSalary = salaryAccumulated - salary * 3;
    const pvfRatePercent = pvfrate ? pvfrate / 100 : 0;
    const pvfAccumulated = resultSalary * pvfRatePercent;

    return pvfAccumulated;
  };

  private calPvfAccumulatedAfterLeft = (empInfo: {
    startdate: string;
    pvfAccumulated: number;
  }) => {
    const { calWorkingTimeAccumulated } = this;
    const { pvfAccumulated, startdate } = empInfo;
    const { workingYearAccumulated } = calWorkingTimeAccumulated(startdate);

    if (workingYearAccumulated < 3) {
      return 0;
    } else if (workingYearAccumulated < 5) {
      return pvfAccumulated - (pvfAccumulated * 50) / 100;
    } else {
      return pvfAccumulated;
    }
  };

  private calIncomeInvestmentByPvf = (empInfo: {
    pvfAccumulated: number;
    startdate: string;
  }) => {
    const {
      interestGroveBondRate,
      handleStartDateFormat,
      calWorkingTimeAccumulated,
      configMonthjoinPvf,
    } = this;
    const { pvfAccumulated, startdate } = empInfo;
    const interestPercent = interestGroveBondRate / 100;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const { startYear } = handleStartDateFormat(startdate);
    const yearAccumulated = currentDate.getFullYear() - startYear;
    const { monthAccumulated } = calWorkingTimeAccumulated(startdate);
    const pvfPerMonth =
      pvfAccumulated / (monthAccumulated - configMonthjoinPvf);
    const incomeInterestAnnual =
      (pvfAccumulated - currentMonth * pvfPerMonth) * interestPercent;
    const incomeInterestAccumulated = incomeInterestAnnual * yearAccumulated;

    return incomeInterestAccumulated;
  };

  fetchEmployee = (): Observable<any> => {
    return this.http.get<Employee>(this.configJsonUrl);
  };

  transformEmployeeInfo = (employeeInfo: {
    employeeid: number;
    firstname: string;
    lastname: string;
    birthdate: string;
    startdate: string;
    employeetype: string;
    salary: number;
    pvfrate: number;
  }) => {
    const {
      calAgeEmployee,
      calCompanyConAccumulated,
      calPvfAccumulated,
      calSalaryAccumulated,
      calIncomeInvestmentByPvf,
      calPvfAccumulatedAfterLeft,
      calWorkingTimeAccumulated,
    } = this;
    const { birthdate, salary, startdate, pvfrate, employeetype, employeeid } =
      employeeInfo;

    if (!employeeid) return {};
    const { workingYearAccumulated } = calWorkingTimeAccumulated(startdate);
    const salaryAccumulated = calSalaryAccumulated({
      salary,
      startdate,
    });
    const companyContribution = calCompanyConAccumulated(salaryAccumulated);
    const pvfAccumulated = calPvfAccumulated({
      salary,
      salaryAccumulated,
      pvfrate,
      employeetype,
      startdate,
    });
    const age = calAgeEmployee(birthdate) || 0;
    const incomeGrovBound = calIncomeInvestmentByPvf({
      pvfAccumulated,
      startdate,
    });
    const companyContributionAfterLeft = calPvfAccumulatedAfterLeft({
      startdate,
      pvfAccumulated,
    });

    return {
      ...employeeInfo,
      age,
      workingYearAccumulated,
      companyContribution,
      companyContributionAfterLeft,
      pvfAccumulated,
      incomeGrovBound,
    };
  };
}
