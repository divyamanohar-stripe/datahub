package server

import play.api.Configuration
import play.api.Logger
import play.core.server.AkkaHttpServer
import play.core.server.AkkaHttpServerProvider
import play.core.server.ServerProvider
import akka.http.scaladsl.ConnectionContext
import akka.http.scaladsl.settings.ParserSettings

/** A custom Akka HTTP server that overrides some akka server settings to help work with Envoy */
class CustomAkkaHttpServer(context: AkkaHttpServer.Context) extends AkkaHttpServer(context) {

  protected override def createParserSettings(): ParserSettings = {
    val defaultSettings: ParserSettings = super.createParserSettings()
    val maybeServerConfig = Option(context.config.configuration.get[Configuration]("play.server.akka"))

    val defaultMaxHeaders = 256
    val maxHeaderCount = maybeServerConfig.flatMap(_.getOptional[Int]("max-headers")).getOrElse(defaultMaxHeaders)

    val logger = Logger(classOf[CustomAkkaHttpServer])
    logger.info(s"Setting max header count to: $maxHeaderCount")

    defaultSettings.withMaxHeaderCount(maxHeaderCount)
  }
}

/** A factory that instantiates a CustomAkkaHttpServer. */
class CustomAkkaHttpServerProvider extends ServerProvider {
  def createServer(context: ServerProvider.Context) = {
    val serverContext = AkkaHttpServer.Context.fromServerProviderContext(context)
    new CustomAkkaHttpServer(serverContext)
  }
}
