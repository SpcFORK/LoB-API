//
//  babelia.cpp
//  
//
//  Created by Jonathan Basile on 6/6/15.
// CC BY-SA-NC
//

#include <Magick++.h>
#include <stdio.h>
#include <boost/multiprecision/gmp.hpp>
#include <cgicc/Cgicc.h>
#include <string>
#include <sstream>
#include <pthread.h>

using namespace std;
using namespace Magick;

#define NUM_THREADS   8
static pthread_mutex_t mutexsum = PTHREAD_MUTEX_INITIALIZER;

Image babel(Geometry(640, 416), Color(MaxRGB, MaxRGB, MaxRGB, 0));

struct ThreadData {
    int xcoor;
    int ycoor;
    boost::multiprecision::mpz_int divide;
};

static const std::string piebald[4096] = {...};

void *quartimg(void *threadarg) {
    ThreadData *data = static_cast<ThreadData *>(threadarg);
    Image quarter(Geometry(160, 208), Color(MaxRGB, MaxRGB, MaxRGB, 0));
    quarter.magick("JPEG");
    Pixels pixcache(quarter);
    PixelPacket *pixpax = pixcache.get(0, 0, 160, 208);
    boost::multiprecision::mpz_int color;

    for (unsigned x = 0; x < 33280; ++x) {
        color = data->divide % 4096;
        *(pixpax++) = Color(piebald[color.convert_to<int>()]);
        data->divide >>= 12;
    }

    pixcache.sync();
    pthread_mutex_lock(&mutexsum);
    babel.composite(quarter, data->xcoor, data->ycoor, OverCompositeOp);
    pthread_mutex_unlock(&mutexsum);
    pthread_exit(nullptr);
}

static const boost::multiprecision::mpz_int power_one;// 2^1697289
static const boost::multiprecision::mpz_int power_two;// 2^399361

int main() {
    cgicc::Cgicc cgi;
    std::string where;
    std::string flip;

    cgicc::form_iterator location = cgi.getElement("location");
    if (location != cgi.getElements().end()) {
        where = cgi("location");
        if (!std::all_of(where.begin(), where.end(), ::isdigit)) {
            return 0;
        }
    } else {
        return 0;
    }

    cgicc::form_iterator orient = cgi.getElement("flip");
    if (orient != cgi.getElements().end()) {
        flip = cgi("flip");
    }

    boost::multiprecision::mpz_int input(where);
    boost::multiprecision::mpz_int *pointer = &input;
    *pointer = (a * (*pointer) + c) % m;
    
    *pointer ^= (*pointer >> 1098239);
    *pointer ^= ((*pointer % maskone) << 698879);
    *pointer ^= ((*pointer % masktwo) << 1497599);
    *pointer ^= (*pointer >> 1797118);

    pthread_t threads[NUM_THREADS];
    ThreadData threadData[NUM_THREADS];
    int rc;

    for (int i = 0; i < NUM_THREADS; ++i) {
        threadData[i].xcoor = (160 * (i % 4));
        threadData[i].ycoor = (208 * (i / 4));
        threadData[i].divide = *pointer % divver;
        *pointer >>= 399361;
        rc = pthread_create(&threads[i], nullptr, quartimg, (void *)&threadData[i]);
    }

    for (int i = 0; i < NUM_THREADS; ++i) {
        void *status;
        pthread_join(threads[i], &status);
    }

    if (flip == "portrait") {
        babel.rotate(90);
    }

    Blob bablob;
    babel.write(&bablob, "JPEG");

    std::ostringstream streampunk;
    streampunk.write(static_cast<char *>(bablob.data()), bablob.length());

    std::cout << "Content-type: image/jpg\n\n";
    std::cout << streampunk.str();
}