//
//  lcgreverse.cpp
//  
//
//  Created by Jonathan Basile on 4/12/15.
//

 #include <iostream>
#include <boost/multiprecision/gmp.hpp>

int main() {
boost::multiprecision::mpz_int m("");

boost::multiprecision::mpz_int a("");

 boost::multiprecision::mpz_int qarray[25];
    qarray[0]=0;
    qarray[1]=1;
    int i =2;
    boost::multiprecision::mpz_int reset = m;
boost::multiprecision::mpz_int quotient;
boost::multiprecision::mpz_int remainder;
    while (m % a >0) {
      remainder=m%a;
      quotient=m/a;
     // std::cout << m << " = " << quotient << "*" << a << " + " << remainder << "\n";
//std::cout << i << "\n";
      qarray[i] =qarray[i-2]-(qarray[i-1]*quotient);
      m=a;
      a=remainder;
      i++;
  }
if (qarray[i-1]<0) {qarray[i-1]+=reset;}
std::cout << qarray[i-1] << "\n";
}