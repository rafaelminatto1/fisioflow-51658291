if(NOT TARGET react-native-worklets::worklets)
add_library(react-native-worklets::worklets SHARED IMPORTED)
set_target_properties(react-native-worklets::worklets PROPERTIES
    IMPORTED_LOCATION "/home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/react-native-worklets@0.7.2_@babel+core@7.28.5_react-native@0.81.5_@babel+core@7.28.5_@react-_o6nacenhxgrjsd6hbgflvg5qie/node_modules/react-native-worklets/android/build/intermediates/cxx/Debug/6u6e6q4c/obj/arm64-v8a/libworklets.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/rafael/antigravity/fisioflow/fisioflow-51658291/node_modules/.pnpm/react-native-worklets@0.7.2_@babel+core@7.28.5_react-native@0.81.5_@babel+core@7.28.5_@react-_o6nacenhxgrjsd6hbgflvg5qie/node_modules/react-native-worklets/android/build/prefab-headers/worklets"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

