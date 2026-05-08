require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'expo-vision-pose-detector'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'MIT'
  s.author         = 'FisioFlow'
  s.homepage       = 'https://fisioflow.com.br'
  s.platform       = :ios, '15.1'
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = false

  s.dependency 'ExpoModulesCore'

  # Vision framework is linked automatically via system frameworks
  s.frameworks     = 'Vision', 'AVFoundation'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE'          => 'YES',
    'SWIFT_COMPILATION_MODE'  => 'wholemodule'
  }

  s.source_files = 'ios/**/*.{h,m,swift}'
end
