if(NOT TARGET react-native-reanimated::reanimated)
add_library(react-native-reanimated::reanimated INTERFACE IMPORTED)
set_target_properties(react-native-reanimated::reanimated PROPERTIES
    INTERFACE_INCLUDE_DIRECTORIES "/home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/react-native-reanimated@4.1.6_@babel+core@7.28.5_react-native-worklets@0.7.2_@babel+core@7.28_454ggspsbghpeqwxkmj53wa2zu/node_modules/react-native-reanimated/android/build/prefab-headers/reanimated"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

