#pragma once
#if __has_include("secrets.h")
#include "secrets.h"
#else
#include "secrets.example.h"
#endif

#ifndef HOME_CLOUD_ENABLED
#define HOME_CLOUD_ENABLED true
#endif
#ifndef HOME_CLOUD_TOKEN
#define HOME_CLOUD_TOKEN ""
#endif
